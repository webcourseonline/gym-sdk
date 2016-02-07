'use strict';

/*!
 * Timekit JavaScript SDK
 * Version: 1.1.0
 * http://timekit.io
 *
 * Copyright 2015 Timekit, Inc.
 * The Timekit JavaScript SDK is freely distributable under the MIT license.
 *
 */
var axios = require('axios');
var base64 = require('base-64');
var humps = require('humps');

function Timekit() {

  /**
   * Auth variables for login gated API methods
   * @type {String}
   */
  var userEmail;
  var userApiToken;
  var includes;

  /**
   * Default config
   * @type {Object}
   */
  var config = {
    app: 'demo',
    apiBaseUrl: '//api.fitness-addict.club/',
    apiVersion: 'v1',
    convertResponseToCamelcase: false
  };

  /**
   * Generate base64 string for basic auth purposes
   * @type {Function}
   * @return {String}
   */

  var encodeAuthHeader = function() {
    return base64.encode(userEmail + ':' + userApiToken);
  };

  /**
   * Build absolute URL for API call
   * @type {Function}
   * @return {String}
   */
  var buildUrl = function(endpoint) {
    return config.apiBaseUrl + config.apiVersion + endpoint;
  };

  /**
   * Root Object that holds methods to expose for API consumption
   * @type {Object}
   */
  var TK = {};


  /**
   * Prepare and make HTTP request to API
   * @type {Object}
   * @return {Promise}
   */
  TK.makeRequest = function(args) {

    // construct URL with base, version and endpoint
    args.url = buildUrl(args.url);

    // add http headers if applicable
    args.headers = { 'Timekit-App': config.app };
    if (userEmail && userApiToken) { args.headers.Authorization = 'Basic ' + encodeAuthHeader(); }
    if (config.inputTimestampFormat) { args.headers['Timekit-InputTimestampFormat'] = config.inputTimestampFormat; }
    if (config.outputTimestampFormat) { args.headers['Timekit-OutputTimestampFormat'] = config.outputTimestampFormat; }
    if (config.timezone) { args.headers['Timekit-Timezone'] = config.timezone; }

    // add dynamic includes if applicable
    if (includes && includes.length > 0) {
      if (args.params === undefined) { args.params = {}; }
      args.params.include = includes.join();
      includes = [];
    }

    // decamelize keys in data objects
    if (args.data) { args.data = humps.decamelizeKeys(args.data); }

    // register response interceptor for data manipulation
    var interceptor = axios.interceptors.response.use(function (response) {
      if(response.data && response.data.data) {
        response.data = response.data.data;
        if (config.convertResponseToCamelcase) {
          response.data = humps.camelizeKeys(response.data);
        }
      }
      return response;
    }, function (error) {
      return Promise.reject(error);
    });

    // execute request!
    var request = axios(args);

    // deregister response interceptor
    axios.interceptors.response.eject(interceptor);

    return request;
  };

  /**
   * Overwrite default config with supplied settings
   * @type {Function}
   * @return {Object}
   */
  TK.configure = function(custom) {
    for (var attr in custom) { config[attr] = custom[attr]; }
    return config;
  };

  /**
   * Returns the current config
   * @type {Function}
   * @return {Object}
   */
  TK.getConfig = function() {
    return config;
  };

  /**
   * Set the active user manuallt (happens automatically on timekit.auth())
   * @type {Function}
   */
  TK.setUser = function(email, apiToken) {
    userEmail = email;
    userApiToken = apiToken;
  };

  /**
   * Returns the current active user
   * @type {Function}
   * @return {Object}
   */
  TK.getUser = function() {
    return {
      email: userEmail,
      apiToken: userApiToken
    };
  };

  /**
   * Add supplied dynamic includes to the next request (fluent/chainable return)
   * @type {Function}
   * @return {Object}
   */
  TK.include = function() {
    includes = Array.prototype.slice.call(arguments);
    return this;
  };

  /**
   * Get user's connected accounts
   * @type {Function}
   * @return {Promise}
   */
  TK.getAccounts = function() {

    return TK.makeRequest({
      url: '/accounts',
      method: 'get'
    });

  };

  /**
   * Redirect to the Google signup/login page
   * @type {Function}
   * @return {String}
   */
  TK.accountGoogleSignup = function(data, shouldAutoRedirect) {

    var url = buildUrl('/accounts/google/signup') + '?Timekit-App=' + config.app + (data && data.callback ? '&callback=' + data.callback : '');

    if(shouldAutoRedirect && window) {
      window.location.href = url;
    } else {
      return url;
    }

  };

  /**
   * Get user's Google calendars
   * @type {Function
   * @return {Promise}
   */
  TK.getAccountGoogleCalendars = function() {

    return TK.makeRequest({
      url: '/accounts/google/calendars',
      method: 'get'
    });

  };

  /**
   * Initiate a server sync on all the users accounts
   * @type {Function}
   * @return {Promise}
   */
  TK.accountSync = function() {

    return TK.makeRequest({
      url: '/accounts/sync',
      method: 'get'
    });

  };

  /**
   * Authenticate a user to retrive API token for future calls
   * @type {Function}
   * @return {Promise}
   */
  TK.auth = function(data) {

    var r = TK.makeRequest({
      url: '/auth',
      method: 'post',
      data: data
    });

    r.then(function(response) {
      TK.setUser(response.data.email, response.data.api_token);
    }).catch(function(){
      TK.setUser('','');
    });

    return r;

  };

  /**
   * Get list of apps
   * @type {Function}
   * @return {Promise}
   */
  TK.getApps = function() {

    return TK.makeRequest({
      url: '/apps',
      method: 'get'
    });

  };

  /**
   * Get settings for a specific app
   * @type {Function}
   * @return {Promise}
   */
  TK.getApp = function(data) {

    return TK.makeRequest({
      url: '/apps/' + data.slug,
      method: 'get'
    });

  };

  /**
   * Create a new Timekit app
   * @type {Function}
   * @return {Promise}
   */
  TK.createApp = function(data) {

    return TK.makeRequest({
      url: '/apps',
      method: 'post',
      data: data
    });

  };

  /**
   * Update settings for a specific app
   * @type {Function}
   * @return {Promise}
   */
  TK.updateApp = function(data) {

    var slug = data.slug;
    delete data.slug;

    return TK.makeRequest({
      url: '/apps/' + slug,
      method: 'put',
      data: data
    });

  };

  /**
   * Delete an app
   * @type {Function}
   * @return {Promise}
   */
  TK.deleteApp = function(data) {

    return TK.makeRequest({
      url: '/apps/' + data.slug,
      method: 'delete'
    });

  };

  /**
   * Get users calendars that are present on Timekit (synced from providers)
   * @type {Function}
   * @return {Promise}
   */
  TK.getCalendars = function() {

    return TK.makeRequest({
      url: '/calendars',
      method: 'get'
    });

  };

  /**
   * Get users calendars that are present on Timekit (synced from providers)
   * @type {Function}
   * @return {Promise}
   */
  TK.getCalendar = function(data) {

    return TK.makeRequest({
      url: '/calendars/' + data.id,
      method: 'get'
    });

  };

  /**
   * Create a new calendar for current user
   * @type {Function}
   * @return {Promise}
   */
  TK.createCalendar = function(data) {

    return TK.makeRequest({
      url: '/calendars/',
      method: 'post',
      data: data
    });

  };

  /**
   * Delete a calendar
   * @type {Function}
   * @return {Promise}
   */
  TK.deleteCalendar = function(data) {

    return TK.makeRequest({
      url: '/calendars/' + data.id,
      method: 'delete'
    });

  };

  /**
   * Get users contacts that are present on Timekit (synced from providers)
   * @type {Function}
   * @return {Promise}
   */
  TK.getContacts = function() {

    return TK.makeRequest({
      url: '/contacts/',
      method: 'get'
    });

  };

  /**
   * Get all user's events
   * @type {Function}
   * @return {Promise}
   */
  TK.getEvents = function(data) {

    return TK.makeRequest({
      url: '/events',
      method: 'get',
      params: data
    });

  };

  /**
   * Get a user's event by ID
   * @type {Function}
   * @return {Promise}
   */
  TK.getEvent = function(data) {

    return TK.makeRequest({
      url: '/events/' + data.id,
      method: 'get'
    });

  };

  /**
   * Create a new event
   * @type {Function}
   * @return {Promise}
   */
  TK.createEvent = function(data) {

    return TK.makeRequest({
      url: '/events',
      method: 'post',
      data: data
    });

  };

  /**
   * Delete a user's event by ID
   * @type {Function}
   * @return {Promise}
   */
  TK.deleteEvent = function(data) {

    return TK.makeRequest({
      url: '/events/' + data.id,
      method: 'delete'
    });

  };

  /**
   * Get a user's anonymized availability (other user's on Timekit can be queryied by supplying their email)
   * @type {Function}
   * @return {Promise}
   */
  TK.getAvailability = function(data) {

    return TK.makeRequest({
      url: '/events/availability',
      method: 'get',
      params: data
    });

  };

  /**
   * Find mutual availability across multiple users/calendars
   * @type {Function}
   * @return {Promise}
   */
  TK.findTime = function(data) {

    return TK.makeRequest({
      url: '/findtime',
      method: 'post',
      data: data
    });

  };

  /**
   * Find mutual availability across multiple users/calendars
   * @type {Function}
   * @return {Promise}
   */
  TK.findTimeBulk = function(data) {

    return TK.makeRequest({
      url: '/findtime/bulk',
      method: 'post',
      data: data
    });

  };

  /**
   * Get a user's meetings
   * @type {Function}
   * @return {Promise}
   */
  TK.getMeetings = function() {

    return TK.makeRequest({
      url: '/meetings',
      method: 'get'
    });

  };

  /**
   * Get a user's specific meeting
   * @type {Function}
   * @return {Promise}
   */
  TK.getMeeting = function(data) {

    return TK.makeRequest({
      url: '/meetings/' + data.id,
      method: 'get'
    });

  };

  /**
   * Get a user's specific meeting
   * @type {Function}
   * @return {Promise}
   */
  TK.createMeeting = function(data) {

    return TK.makeRequest({
      url: '/meetings',
      method: 'post',
      data: data
    });

  };

  /**
   * Get a user's specific meeting
   * @type {Function}
   * @return {Promise}
   */
  TK.updateMeeting = function(data) {

    var id = data.id;
    delete data.id;

    return TK.makeRequest({
      url: '/meetings/' + id,
      method: 'put',
      data: data
    });

  };

  /**
   * Set availability (true/faalse) on a meeting's suggestion
   * @type {Function}
   * @return {Promise}
   */
  TK.setMeetingAvailability = function(data) {

    return TK.makeRequest({
      url: '/meetings/availability',
      method: 'post',
      data: data
    });

  };

  /**
   * Book/finalize the meeting, sending out meeting invites to all participants
   * @type {Function}
   * @return {Promise}
   */
  TK.bookMeeting = function(data) {

    return TK.makeRequest({
      url: '/meetings/book',
      method: 'post',
      data: data
    });

  };

  /**
   * Invite users/emails to a meeting, sending out invite emails to the supplied addresses
   * @type {Function}
   * @return {Promise}
   */
  TK.inviteToMeeting = function(data) {

    var id = data.id;
    delete data.id;

    return TK.makeRequest({
      url: '/meetings/' + id + '/invite',
      method: 'post',
      data: data
    });

  };

  /**
   * Create a new user with the given properties
   * @type {Function}
   * @return {Promise}
   */
  TK.createUser = function(data) {

    return TK.makeRequest({
      url: '/users',
      method: 'post',
      data: data
    });

  };

  /**
   * Fetch current user data from server
   * @type {Function}
   * @return {Promise}
   */
  TK.getUserInfo = function() {

    return TK.makeRequest({
      url: '/users/me',
      method: 'get'
    });

  };

  /**
   * Fetch current user data from server
   * @type {Function}
   * @return {Promise}
   */
  TK.updateUser = function(data) {

    return TK.makeRequest({
      url: '/users/me',
      method: 'put',
      data: data
    });

  };

  /**
   * Reset password for a user
   * @type {Function}
   * @return {Promise}
   */
  TK.resetUserPassword = function(data) {

    return TK.makeRequest({
      url: '/users/resetpassword',
      method: 'post',
      data: data
    });

  };

  /**
   * Get a specific users' timezone
   * @type {Function}
   * @return {Promise}
   */
  TK.getUserTimezone = function(data) {

    return TK.makeRequest({
      url: '/users/timezone/' + data.email,
      method: 'get'
    });

  };

  /**
   * Get a user property by key
   * @type {Function}
   * @return {Promise}
   */
  TK.getUserProperties = function() {

    return TK.makeRequest({
      url: '/properties',
      method: 'get'
    });

  };

  /**
   * Get a user property by key
   * @type {Function}
   * @return {Promise}
   */
  TK.getUserProperty = function(data) {

    return TK.makeRequest({
      url: '/properties/' + data.key,
      method: 'get'
    });

  };

  /**
   * Set or update user properties
   * @type {Function}
   * @return {Promise}
   */
  TK.setUserProperties = function(data) {

    return TK.makeRequest({
      url: '/properties',
      method: 'put',
      data: data
    });

  };

  /**
   * Get all user auth credentials
   * @type {Function}
   * @return {Promise}
   */
  TK.getCredentials = function() {

    return TK.makeRequest({
      url: '/credentials',
      method: 'get'
    });

  };

    /**
   * Create a new pair of auth credentials
   * @type {Function}
   * @return {Promise}
   */
  TK.createCredential = function(data) {

    return TK.makeRequest({
      url: '/credentials',
      method: 'post',
      data: data
    });

  };

  /**
   * Delete a pair of auth credentials
   * @type {Function}
   * @return {Promise}
   */
  TK.deleteCredential = function(data) {

    return TK.makeRequest({
      url: '/credentials/' + data.id,
      method: 'delete'
    });

  };

  return TK;

}

module.exports = new Timekit();
