// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import 'zone.js';
import 'zone.js/testing';
import {getTestBed} from '@angular/core/testing';
import {BrowserDynamicTestingModule, platformBrowserDynamicTesting} from '@angular/platform-browser-dynamic/testing';

/**
 * TODO [Angular 17]
 * Starting with Angular 15, this file can be removed and 'zone.js' polyfills can be specified directly in angular.json.
 * However, when removing this file and specifying polyfills in angular.json, we experienced unexpected promise rejection errors in tests.
 * We have reported an issue to Angular: https://github.com/angular/angular/issues/48386
 */

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);
