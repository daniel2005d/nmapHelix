var app = angular.module('nmapHelix', ['ngRoute']);

// app.run(function ($rootScope, apiBaseUrl) {
//     apiBaseUrl = "http://127.0.0.1:5000"
//     $rootScope.apiBaseUrl = apiBaseUrl;

//   });

app.config(['$routeProvider', function ($routeProvider) {
    $routeProvider
        .when('/', {
            templateUrl: 'home.html',
            controller: 'HomeController'
        })

        .when('/detail/:project_id', {
            templateUrl: 'detail.html',
            controller: 'MainController'
        })

        .otherwise({ redirectTo: '/' });
}]);

app.run(function ($rootScope, apiBaseUrl) {
  $rootScope.apiBaseUrl = apiBaseUrl;

});

app.factory('ApiService', function ($http, apiBaseUrl) {

    const baseUrl = apiBaseUrl;


    function handleError(error) {
        console.error('API Error:', error);

        let message = 'Ocurrió un error inesperado.';

        if (error.data && error.data.message) {
            message = error.data.message;
        } else if (error.statusText) {
            message = `${error.status} - ${error.statusText}`;
        }


        return Promise.reject(error);
    }

    return {
        get: function (endpoint, params = {}) {
            return $http.get(`${baseUrl}/${endpoint}`, { params: params })
                .catch(handleError);
        },

        post: function (endpoint, data) {
            return $http.post(`${baseUrl}/${endpoint}`, data)
                .catch(handleError);
        },

        upload: function (endpoint, formData) {
            return $http.post(`${baseUrl}/${endpoint}`, formData, {
                transformRequest: angular.identity,
                headers: { 'Content-Type': undefined }
            }).catch(handleError);
        }


    };
});

app.factory('ProjectService', function ($location) {

    let currentProject = null;

    return {

        setProject: function (project) {
            sessionStorage.setItem("currentProject", project)
            $location.path('/detail');
        },

        getProject: function () {
            currentProject = sessionStorage.getItem("currentProject")
            return currentProject;
        },

        clearProject: function () {
            sessionStorage.removeItem("currentProject");
            $location.path('/');
        }
    };
});

app.controller('IndexController', ['$scope', 'ApiService', 'ProjectService', function ($scope, ApiService, ProjectService) {
    $scope.changeProject = function () {
        ProjectService.clearProject();
    }
}]);

app.controller('HomeController', ['$scope', 'ProjectService', 'ApiService', '$location', function ($scope, ProjectService, ApiService, $location) {

    project_id = ProjectService.getProject();
    $scope.savedProjects = [];

    ApiService.get('projects').then(function (result) {
        $scope.savedProjects = result.data
    });


    if (project_id) {
        $location.path('/detail/' + project_id);
    }

    $scope.selectProject = function (project) {
        ProjectService.setProject(project.id);
    }

    $scope.createNewProject = function () {
        const name = prompt("Nombre del nuevo proyecto:");
        if (name) {
            ApiService.post('projects/create', { "name": name }).then(function (result) {
                ProjectService.setProject(result.data.project_id);
            })


        }
    };


}]);

app.controller('MainController', ['$scope', 'ApiService', '$routeParams', 'ProjectService', '$http',
    function ($scope, ApiService, $routeParams, ProjectService, $http) {
        $scope.toasts = [];
        $scope.toggleState = false;
        $scope.currentTab = 'hosts';
        const project_id = $routeParams.project_id;
        $scope.filteredTableRows = [];
        $scope.credentialsServices = [];
        
        $scope.setTab = function (tabName) {
            $scope.currentTab = tabName;

        };

        $scope.getIconForService = function (serviceName) {
            const name = serviceName.toLowerCase();
            const iconMapping = [
                { pattern: /postgresql|postgres|psql/i, icon: '/images/services/postgresql.png' },
                { pattern: /apache tomcat|tomcat/i, icon: '/images/services/tomcat.png' },
                { pattern: /apache/i, icon: '/images/services/apache.png' },
                { pattern: /ssh/i, icon: '/images/services/ssh.png' },
                { pattern: /mysql/i, icon: '/images/services/mysql.png' },
                { pattern: /signiant/i, icon: '/images/services/signiant.svg' },
                { pattern: /java/i, icon: '/images/services/java.png' },
                { pattern: /wildfly/i, icon: '/images/services/wildfly.png' },
            ];

            const found = iconMapping.find(item => item.pattern.test(name));
            return found ? found.icon : 'https://cdn-icons-png.flaticon.com/128/2991/2991108.png';
        };

        $scope.init = function () {
            ApiService.get(`services/${project_id}`).then(function (response) {
                $scope.filteredTableRows = response.data;
                $scope.credentialsServices = response.data;
            })

            ApiService.get(`services/summary/${project_id}`).then(function (response) {
                $scope.services = response.data;

            });

            ApiService.get(`services/product_summary/${project_id}`).then(function (response) {
                $scope.products = response.data;

            });

            ApiService.get(`hosts/${project_id}`).then(function (response) {
                $scope.hosts = response.data;

            });

            ApiService.get(`credentials/${project_id}`).then(function (response) {
                $scope.credentials = response.data;

            });
            
        }

        /* Credenciales */

        $scope.openModal = function () {
            
            $scope.showModal = true;
            // Inicializamos modalCred para limpiar campos de una edición anterior
            $scope.modalCred = {
                username: '',
                password: '',
                hash: '',
                role: 'usuario',
                type: 'clear-text'
            };

            // Opcional: Reiniciar el estado de selección de los servicios
            angular.forEach($scope.services, function (service) {
                service.selected = false;
            });
        };

        // Asegúrate también de tener implementado el cierre:
        $scope.closeModal = function () {
            $scope.showModal = false;
        };

        $scope.saveCredential = function(){
            $scope.modalCred.ports = [];
            $scope.credentialsServices.forEach((item)=>{
                if (item.selected){
                    $scope.modalCred.ports.push(item.port_id);
                }
            })
            
            ApiService.post('credentials/create', $scope.modalCred).then(function(response){
                $scope.closeModal();
            });
        }

        /* Fin de Credenciales */


        $scope.uploadFile = function (file) {
            if (!file) return;

            // Asumimos que tienes el ID del proyecto disponible en el scope
            var formData = new FormData();
            formData.append('file', file);

            // Usamos $http para enviar el archivo
            ApiService.upload(`services/upload/${project_id}`, formData, {
                headers: { 'Content-Type': undefined },
                transformRequest: angular.identity
            }).then(function (response) {
                $scope.showNotification("Archivo procesado con éxito:", response.data.message, "info");
                // Opcional: Recargar los datos del proyecto tras la subida
                $scope.init();
            }).catch(function (err) {
                $scope.showNotification("Error al subir archivo:", err.data.detail, "error");
            });
        };

        $scope.cacheOriginal = function (field, row) {
            if (!row.originalValue) {
                row.originalValue = {};
            }

            row.originalValue[field] = row[field];
        };
        


        $scope.updateprop = function (event, field, row, service='ports') {

            // // 1. Comprobamos si el valor ha cambiado
            if (row.originalValue && row.originalValue[field]) {
                if (row[field] === row.originalValue[field]) {
                    console.log("No hubo cambios, omitiendo petición.");
                    return; // Salimos de la función, no hacemos nada más
                }
            }


            if (event.which === 13 || event.type === 'blur' || event.type === 'click') {
                var endpoint = ''
                var post_data = {  "name": field, "value": row[field] };
                if (field === 'discovered') {
                    row[field] = !row[field];
                }

                if (service === 'ports'){
                    endpoint = 'services/update'
                    post_data.id = row.port_id;
                }
                else{
                    endpoint = 'hosts/update'
                    post_data.id = row.id;
                }

                   ApiService.post(endpoint, post_data).then(function (response) {
                        $scope.showNotification('Actualización de puerto', response.data.status, 'info');
                    });
                
            }

        }

        $scope.showNotification = function (title, message, type) {
            var toast = {
                title: title,
                message: message,
                type: type || 'info'
            };
            $scope.toasts.push(toast);

            setTimeout(function () {
                $scope.$apply(function () {
                    var index = $scope.toasts.indexOf(toast);
                    if (index !== -1) {
                        $scope.toasts.splice(index, 1);
                    }
                });
            }, 6000);
        };

        $scope.init();
    }]);