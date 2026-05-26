var app = angular.module('nmapHelix', ['ngRoute']);

// 1. Interceptor para el loading automático
app.config(['$httpProvider', function ($httpProvider) {
    $httpProvider.interceptors.push(['$rootScope', '$q', function ($rootScope, $q) {
        return {
            request: function (config) {
                $rootScope.isLoading = true;
                return config;
            },
            response: function (response) {
                $rootScope.isLoading = false;
                return response;
            },
            responseError: function (rejection) {
                $rootScope.isLoading = false;
                return $q.reject(rejection);
            }
        };
    }]);
}])

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

    const project_id = ProjectService.getProject();
    if (project_id) {
        ApiService.get(`projects/${project_id}`).then(function (response) {
            $scope.currentProject = response.data.name;
        });
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

app.controller('MainController', ['$scope', 'ApiService', '$routeParams', 'ProjectService', '$http', '$timeout',
    function ($scope, ApiService, $routeParams, ProjectService, $http, $timeout) {
        $scope.toasts = [];
        $scope.toggleState = false;
        $scope.currentTab = 'hosts';
        const project_id = $routeParams.project_id;
        $scope.filteredTableRows = [];
        $scope.credentialsServices = [];
        //$scope.series = ['Servicio', 'Total'];

        $scope.initChart = function () {
            Highcharts.chart('container', {

                chart: {
                    type: 'column',

                },

                title: {
                    text: 'Servicios'
                },



                xAxis: {
                    type: 'category'
                },


                legend: {
                    enabled: false
                },

                series: [{
                    name: 'Labor Costs',
                    data: $scope.chartSeries,


                    borderRadius: 3,
                    colorByPoint: true
                }]

            });

        }

        $scope.setTab = function (tabName) {
            $scope.currentTab = tabName;

            if (tabName === 'services-discovered') {
                $timeout($scope.initChart, 120);

            }

        };

        $scope.copied = {};
        $scope.copyCommand = function (cmd, index) {
            navigator.clipboard.writeText(cmd).then(function () {
                $scope.copied[index] = true;

                // Volver a falso después de 2 segundos
                $timeout(function () {
                    $scope.copied[index] = false;
                }, 2000);

                // Forzar actualización de la vista si es necesario
                $scope.$apply();
            });
        };

        $scope.getPortCss = function(row){
            const css = "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium  inset-ring "
                         
            var colorclass =  "bg-yellow-400/10 text-yellow-500 inset-ring-yellow-400/20";
            if (row.service_name === 'ssh' 
                || row.service_name === 'http' 
                || row.service_name === 'httpd' 
                || row.service_name === 'https'
                || row.service_name === 'rpcbind'
                || row.service_name === 'postgresql'
                ){
                colorclass = "bg-green-400/10 text-green-400 inset-ring-green-500/20"
            }

            return `${css} ${colorclass}`;
        }

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

                const ipGroup = response.data.reduce((acc, item) => {
                    if (!acc[item.ip]) {
                        acc[item.ip] = [];
                    }
                    acc[item.ip].push(item.port);
                    return acc;
                }, {});

                $scope.nmap = Object.keys(ipGroup).map(ip => {
                    const ports = ipGroup[ip].join(',');
                    return `nmap -Pn -n -T5 -sV -sC ${ip} -p ${ports} -oA nmap/${ip}_filterports`;
                });

            })

            ApiService.get(`services/summary/${project_id}`).then(function (response) {
                $scope.services = response.data;

            });

            ApiService.get(`services/product_summary/${project_id}`).then(function (response) {
                $scope.products = response.data;

            });

            ApiService.get(`services/service_total/${project_id}`).then(function (response) {
                $scope.total_services = response.data;
                $scope.chartSeries = [];


                $scope.total_services.forEach((item) => {
                    $scope.chartSeries.push([item.service_name, item.count]);
                })


            });


            ApiService.get(`hosts/${project_id}`).then(function (response) {
                $scope.hosts = response.data;

            });

            ApiService.get(`credentials/${project_id}`).then(function (response) {
                $scope.credentials = response.data;

            });

        }

        /* Comandos */

        $scope.openCommandModal = function (row) { $scope.selectedRow = row; $scope.commandInput = $scope.selectedRow.commands; $scope.showCommandModal = true; };
        $scope.closeCommandModal = function () {
            $scope.showCommandModal = false;
            $scope.selectedRow = null; // Limpiar la fila seleccionada
            $scope.commandInput = '';  // Limpiar el contenido del comando
        };
        $scope.sendCommand = function (row, commandInput) {
            ApiService.post('services/add_command', { "id": row.port_id, "command": commandInput }).then(function (response) {
                $scope.closeCommandModal();

            }).catch(function (err) {
                $scope.showNotification("Error al guardar el comando:", err.data.detail, "error");
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

        $scope.saveCredential = function () {
            $scope.modalCred.ports = [];
            $scope.credentialsServices.forEach((item) => {
                if (item.selected) {
                    $scope.modalCred.ports.push(item.port_id);
                }
            })

            ApiService.post('credentials/create', $scope.modalCred).then(function (response) {
                $scope.closeModal();
                $scope.init();
            });
        }

        /* Fin de Credenciales */


        $scope.uploadFile = function () {

            var formData = new FormData();
            let files = document.getElementById('fileInput').files;
            for (let i = 0; i < files.length; i++) {
                formData.append('files', files[i]);
            }

            // Usamos $http para enviar el archivo
            ApiService.upload(`services/upload/${project_id}`, formData, {
                headers: { 'Content-Type': undefined },
                transformRequest: angular.identity
            }).then(function (response) {
                $scope.showNotification("Archivo procesado con éxito:", response.data.message, "info");
                // Opcional: Recargar los datos del proyecto tras la subida
                $scope.init();
                document.getElementById('fileInput').value = null;
            }).catch(function (err) {
                document.getElementById('fileInput').value = null;
                $scope.showNotification("Error al subir archivo:", err.data.detail, "error");
            });
        };

        $scope.cacheOriginal = function (field, row) {
            if (!row.originalValue) {
                row.originalValue = {};
            }

            row.originalValue[field] = row[field];
        };



        $scope.updateprop = function (event, field, row, service = 'ports') {

            // // 1. Comprobamos si el valor ha cambiado
            if (row.originalValue && row.originalValue[field]) {
                if (row[field] === row.originalValue[field]) {
                    console.log("No hubo cambios, omitiendo petición.");
                    return; // Salimos de la función, no hacemos nada más
                }
            }


            if (event.which === 13 || event.type === 'blur' || event.type === 'click') {
                var endpoint = ''
                var post_data = { "name": field, "value": row[field] };
                if (field === 'discovered') {
                    row[field] = !row[field];
                }

                if (service === 'ports') {
                    endpoint = 'services/update'
                    post_data.id = row.port_id;
                }
                else {
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