'use strict';

var roles = {
    superUser: 0,
    admin: 1,
    user: 2
};

var routeForUnauthorizedAccess = '/SomeAngularRouteForUnauthorizedAccess';

var App = angular.module('myApp',['ngRoute','ngResource']);

function isNull(aVariable) {
    if (aVariable == null || aVariable === undefined || aVariable === 'undefined' || aVariable == undefined || aVariable == 'undefined' || aVariable === null)
        return true;
    return false;
}

App.config(['$routeProvider', function($routeProvider, $locationProvider) {
    $routeProvider
        .when('/home', {
            templateUrl: 'home',
            controller : "LoginController as ctrl",
            resolve: {}
        })
        .when('/products', {
            templateUrl: 'products',
            caseInsensitiveMatch: true,
            controller : "ProductController as pCtrl",
            resolve: { //Here we would use all the hardwork we have done
                //above and make call to the authorization Service
                //resolve is a great feature in angular, which ensures that a route
                //controller (in this case ProductController ) is invoked for a route
                //only after the promises mentioned under it are resolved.
                permission: function(authorizationService, $route) {
                    return authorizationService.permissionCheck([roles.superUser]);
                },
            }
        }).when('/news', {
            templateUrl: 'news',
            controller : "NewsFeedController as nCtrl",
            resolve: {}
        }).when('/contact', {
            templateUrl: 'contact',
            controller : "ContactController as contactCtrl",
            resolve: {}
        }).when('/superUserSpecificRoute', {
            templateUrl: '/templates/superUser.html', //path of the view/template of route
            caseInsensitiveMatch: true,
            controller: 'superUserController', //controller which would be used for the route
            resolve: { //Here we would use all the hardwork we have done
                //above and make call to the authorization Service
                //resolve is a great feature in angular, which ensures that a route
                //controller (in this case superUserController ) is invoked for a route
                //only after the promises mentioned under it are resolved.
                permission: function(authorizationService, $route) {
                    return authorizationService.permissionCheck([roles.superUser]);
                },
            }
        })
        .when('/userSpecificRoute', {
            templateUrl: '/templates/user.html',
            caseInsensitiveMatch: true,
            controller: 'userController',
            resolve: {
                permission: function(authorizationService, $route) {
                    return authorizationService.permissionCheck([roles.user]);
                },
            }
        })
        .when('/adminSpecificRoute', {
            templateUrl: '/templates/admin.html',
            caseInsensitiveMatch: true,
            controller: 'adminController',
            resolve: {
                permission: function(authorizationService, $route) {
                    return authorizationService.permissionCheck([roles.admin]);
                },
            }
        })
        .when('/adminSuperUserSpecificRoute', {
            templateUrl: '/templates/adminSuperUser.html',
            caseInsensitiveMatch: true,
            controller: 'adminSuperUserController',
            resolve: {
                permission: function(authorizationService, $route) {
                    return authorizationService.permissionCheck([roles.admin, roles.superUser]);
                },
            }
        })
        // Route for unauthorized access (When permission is not given to visit a page)
        .when(routeForUnauthorizedAccess,
            {
                templateUrl: '/unauthorized',
                caseInsensitiveMatch: true
            })
        .when('/items/printers', {
            templateUrl: 'items/printers',
            controller : "ItemListController as itemListCtrl",
            resolve: {}
        })
        .when('/items/computerdetails/:id', {
            templateUrl: 'items/computerdetails',
            controller : "ItemDetailsController as itemDetailsCtrl",
            resolve: {}
        })
        .when('/items/phonedetails/:id', {
            templateUrl: 'items/phonedetails',
            controller : "ItemDetailsController as itemDetailsCtrl",
            resolve: {}
        })
        .when('/items/printerdetails/:id', {
            templateUrl: 'items/printerdetails',
            controller : "ItemDetailsController as itemDetailsCtrl",
            resolve: {}
        }).otherwise({redirectTo:'/home'});
}]);


//Step 2

App.factory('authorizationService', function ($resource, $q, $rootScope, $location, sharedProperties) {
    return {
        // We would cache the permission for the session,
        //to avoid roundtrip to server
        //for subsequent requests

        permissionModel: {
            permission: {},
            isPermissionLoaded: false
        },

        permissionCheck: function (roleCollection) {

            // we will return a promise .
            var deferred = $q.defer();

            //this is just to keep a pointer to parent scope from within promise scope.
            var parentPointer = this;

            //Checking if permission object(list of roles for logged in user)
            //is already filled from service
            if (this.permissionModel.isPermissionLoaded) {
                //Check if the current user has required role to access the route
                this.getPermission(this.permissionModel, roleCollection, deferred);
            } else {
                //if permission is not obtained yet, we will get it from  server.
                // 'api/permissionService' is the path of server web service , used for this example.
                   /**
                $resource('/permission').get().$promise.then(function (response) {
                    //when server service responds then we will fill the permission object
                    parentPointer.permissionModel.permission = response;

                    //Indicator is set to true that permission object is filled and
                    //can be re-used for subsequent route request for the session of the user
                    parentPointer.permissionModel.isPermissionLoaded = true;

                    //Check if the current user has required role to access the route
                    parentPointer.getPermission(parentPointer.permissionModel, roleCollection, deferred);
                });
                **/

                var user = sharedProperties.getUser();
                console.log("loggin user");
                console.log(user);
                console.log("logged user");
                if (!isNull(user)) {
                    parentPointer.permissionModel.permission = sharedProperties.getUser().permission;
                    parentPointer.permissionModel.isPermissionLoaded = true;
                    parentPointer.getPermission(parentPointer.permissionModel, roleCollection, deferred);
                }

            }
            return deferred.promise;
        },

        //Method to check if the current user has required role to access the route
        //'permissionModel' has permission information obtained from server for current user
        //'roleCollection' is the list of roles which are authorized to access route
        //'deferred' is the object through which we shall resolve promise
        getPermission: function (permissionModel, roleCollection, deferred) {
            var ifPermissionPassed = false;

            angular.forEach(roleCollection, function (role) {
                switch (role) {
                    case roles.superUser:
                        if (permissionModel.permission.isSuperUser) {
                            ifPermissionPassed = true;
                        }
                        break;
                    case roles.admin:
                        if (permissionModel.permission.isAdministrator) {
                            ifPermissionPassed = true;
                        }
                        break;
                    case roles.user:
                        if (permissionModel.permission.isUser) {
                            ifPermissionPassed = true;
                        }
                        break;
                    default:
                        ifPermissionPassed = false;
                }
            });
            if (!ifPermissionPassed) {
                //If user does not have required access,
                //we will route the user to unauthorized access page
                $location.path(routeForUnauthorizedAccess);
                //As there could be some delay when location change event happens,
                //we will keep a watch on $locationChangeSuccess event
                // and would resolve promise when this event occurs.
                $rootScope.$on('$locationChangeSuccess', function (next, current) {
                    deferred.resolve();
                });
            } else {
                deferred.resolve();
            }
        }
    };
});

//Service

App.service('sharedProperties', function () {
    var user;

    return {
        getUser: function () {
            return user;
        },
        setUser: function(value) {
            user = value;
        }
    };
});