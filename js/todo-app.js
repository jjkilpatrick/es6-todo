/*
Constant (const) definitions are block scoped, but their values are read-only. 
This means they cannot be re-declared later on. Backbone’s core component definitions 
don’t need to be modified, so we can combine constants and an ES6 pattern called 
destructuring assignment to create shorter aliases for Models, Views and other components. 
*/

var {
	Model, View, Collection, Router, LocalStorage
} = Backbone;

// Const currently disabled due to https://github.com/google/traceur-compiler/issues/595 
// but would otherwise be written: const { Model, View, Collection, Router, LocalStorage } = Backbone;

var ENTER_KEY = 13; // const
var TodoFilter = ''; // let - if used in blocks it is only visible in that scope

// Classes are compact and we can use an ‘extend’ keyword to implement a new sub-class from a 
// base-class. Below, we do this to define a Todo class which extends Backbone’s Model component.

class Todo extends Model {

	// Note the omission of the ‘function’ keyword— it is optional in ES6.
	defaults() {
		return {
			title: '',
			completed: false
		};
	}

	// Toggle the completed state of a model
	toggle() {
		this.save({
			completed: !this.get('completed')
		});
	}

}

class TodoList extends Collection {

	// Specifying a constructor lets us define the class constructor. 
	// Use of the super keyword in your constructor lets you call the 
	// constructor of a parent class so that it can inherit all of its properties.
	constructor(options) {
		super(options);
		// Reference model
		this.model = Todo;
		// Instantiate LocalStorage
		this.localStorage = new LocalStorage('es6-todos');
	}

	// Filter down the list of all todo items that are finished.
	completed() {
		return this.filter(todo => todo.get('completed'));
	}

	// Filter down the list to only todo items that are still not finished.
	remaining() {
		return this.without(...this.completed());
	}

	// Gets the index for any new models
	nextOrder() {
		if (!this.length) {
			return 1;
		}

		return this.last().get('order') + 1;
	}

	// Todos are sorted by their original insertion order.
	comparator(todo) {
		return todo.get('order');
	}

}

// Create global collection of Todos
// return new TodosCollection();
var Todos = new TodoList();

// View for an individual Todo item
class TodoView extends View {

	constructor(options) {
		
		this.tagName = 'li';
		this.template = _.template($('#item-template').html());
		this.input = '';
		this.events = {
			'click .toggle': 'toggleCompleted',
			'dblclick label': 'edit',
			'click .destroy': 'clear',
			'keypress .edit': 'updateOnEnter',
			'blur .edit': 'close'
		};

		// Import properties from base class
		super(options);

		this.listenTo(this.model, 'change', this.render);
		this.listenTo(this.model, 'destroy', this.remove);
		this.listenTo(this.model, 'visible', this.toggleVisible);

	}

	render() {
		this.$el.html(this.template(this.model.toJSON()));
		this.$el.toggleClass('completed', this.model.get('completed'));
		this.toggleVisible();
		this.input = this.$('.edit');
		return this;
	}

	// Toggle visible state of todo
	toggleVisible() {
		this.$el.toggleClass('hidden', this.isHidden);
	}

	// Getters have been part of ES5. Getters simply return a value
	// any function which returns a value is basically a getter
	// http://javascriptplayground.com/blog/2013/12/es5-getters-setters/
	get isHidden() {
		var isCompleted = this.model.get('completed'); // const
		return ( // hidden cases only
			(!isCompleted && TodoFilter === 'completed') ||
			(isCompleted && TodoFilter === 'active')
		);
	}

	// Toggle the `"completed"` state of the model.
	toggleCompleted() {
		this.model.toggle();
	}

	// Edit a Todo
	edit() {
		var value = this.input.val(); // const

		this.$el.addClass('editing');
		this.input.val(value).focus();
	}

	// Close a Todo
	close() {
		var title = this.input.val(); // const

		if (title) {
			this.model.save({
				title
			});
		} else {
			this.clear();
		}

		this.$el.removeClass('editing');
	}

	// Update a Todo on Enter
	updateOnEnter(e) {
		if (e.which === ENTER_KEY) {
			this.close();
		}
	}

	// Destroy a Todo model
	clear() {
		this.model.destroy();
	}

}

export class AppView extends View {

	constructor() {

		this.setElement($('#todoapp'), true);

		this.statsTemplate = _.template($('#stats-template').html()),

		this.events = {
			'keypress #new-todo': 'createOnEnter',
			'click #clear-completed': 'clearCompleted',
			'click #toggle-all': 'toggleAllComplete'
		};

		this.allCheckbox = this.$('#toggle-all')[0];
		this.$input = this.$('#new-todo');
		this.$footer = this.$('#footer');
		this.$main = this.$('#main');

		this.listenTo(Todos, 'add', this.addOne);
		this.listenTo(Todos, 'reset', this.addAll);
		this.listenTo(Todos, 'change:completed', this.filterOne);
		this.listenTo(Todos, 'filter', this.filterAll);
		this.listenTo(Todos, 'all', this.render);

		Todos.fetch();

		super();
	}

	render() {
		var completed = Todos.completed().length; // const
		var remaining = Todos.remaining().length; // const

		if (Todos.length) {
			this.$main.show();
			this.$footer.show();

			this.$footer.html(
				this.statsTemplate({
					completed, remaining
				})
			);

			this.$('#filters li a')
				.removeClass('selected')
				.filter('[href="#/' + (TodoFilter || '') + '"]')
				.addClass('selected');
		} else {
			this.$main.hide();
			this.$footer.hide();
		}

		this.allCheckbox.checked = !remaining;
	}

	addOne(model) {
		var view = new TodoView({
			model
		}); // const
		$('#todo-list').append(view.render().el);
	}

	addAll() {
		this.$('#todo-list').html('');
		Todos.each(this.addOne, this);
	}

	filterOne(todo) {
		todo.trigger('visible');
	}

	filterAll() {
		Todos.each(this.filterOne, this);
	}

	newAttributes() {
		return {
			title: this.$input.val().trim(),
			order: Todos.nextOrder(),
			completed: false
		};
	}

	createOnEnter(e) {
		if (e.which !== ENTER_KEY || !this.$input.val().trim()) {
			return;
		}

		Todos.create(this.newAttributes());
		this.$input.val('');
	}

	clearCompleted() {
		_.invoke(Todos.completed(), 'destroy');
		return false;
	}

	toggleAllComplete() {
		var completed = this.allCheckbox.checked; // const
		Todos.each(todo => todo.save({
			completed
		}));
	}

}

export class Filters extends Router {

	constructor() {
		this.routes = {
			'*filter': 'filter'
		}

		this._bindRoutes();
	}

	filter(param = '') {
		// *Set the current filter to be used.*
		TodoFilter = param;

		// *Trigger a collection filter event, causing hiding/unhiding
		// of Todo view items.*
		Todos.trigger('filter');
	}
}