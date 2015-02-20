// #Imports
// We import the classes we defined in the TodoApp module using the `import` keyword.

import {AppView, Filters} from './todo-app';

// #Document Ready
$(() => {
  new AppView();
  new Filters();
  Backbone.history.start();
});