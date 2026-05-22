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

app.factory('ApiService', function ($http) {

    const baseUrl = "http://127.0.0.1:5000/api";


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
        }

        // clearProject: function() {
        //     currentProject = null;
        // }
    };
});

app.controller('HomeController', ['$scope', '$http', 'ProjectService', 'ApiService', '$location', function ($scope, $http, ProjectService, ApiService, $location) {

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
            ApiService.post('project', { "name": name }).then(function (result) {
                ProjectService.setProject(result.data.project_id);
            })


        }
    };


}]);

app.controller('MainController', ['$scope', 'ApiService', '$routeParams', 'ProjectService', '$http',
    function ($scope, ApiService, $routeParams, ProjectService, $http) {
        $scope.toasts = [];
        $scope.toggleState = false;
        $scope.currentTab = 'inventory';
        const project_id = $routeParams.project_id;
        $scope.filteredTableRows = []

        ApiService.get(`data/${project_id}`).then(function (response) {
            $scope.filteredTableRows = response.data;
        })
        ApiService.get(`services/${project_id}`).then(function (response) {
            $scope.services = response.data;
          
        });

        $scope.cacheOriginal = function(field, row) {
            if (!row.originalValue){
                row.originalValue = {};
            }

            row.originalValue[field] = row[field];
        };

        $scope.updateprop = function (event, field, row) {
            
            // // 1. Comprobamos si el valor ha cambiado
            if (row.originalValue && row.originalValue[field]){
                if (row[field] === row.originalValue[field]) {
                    console.log("No hubo cambios, omitiendo petición.");
                    return; // Salimos de la función, no hacemos nada más
                }
            }
            

            if (event.which === 13 || event.type === 'blur' || event.type === 'click') {
                if (field === 'discovered'){
                    row[field] = !row[field];
                }
                ApiService.post(`ports/update/${row.port_id}`, { [field]: row[field] }).then(function(response){
                    $scope.showNotification('Actualización de puerto', response.data.status, 'info');
                })
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

        
        // $scope.panStartX = 0;
        // $scope.panStartY = 0;

        // $scope.draggedNode = null;
        // $scope.dragOffsetX = 0;
        // $scope.dragOffsetY = 0;

        // $scope.stats = {
        //     totalHosts: 0,
        //     totalPorts: 0,
        //     avgPortsPerHost: '0'
        // };

        // $scope.graphData = { nodes: [], links: [] };
        // $scope.portsGraphData = { nodes: [], links: [] };
        // $scope.filteredTableRows = [];
        // $scope.servicesSummary = []; // Listado unificado para descarga
        // $scope.activeTarget = null;



        // // --- Inicialización del Sistema ---
        // $scope.init = function() {
        //     ApiService.get('data/'+ ProjectService.getProject())
        //         .then(function(response) {
        //             console.log(response);
        //             $scope.hosts = response.data;
        //             $scope.updateAll();
        //             $scope.isLocalMode = false;
        //             }, function() {
        //             $scope.isLocalMode = true;
        //             $scope.showNotification("Modo Autónomo Local", "Sin conexión con backend. Las transacciones se procesarán localmente.", "info");
        //         });

        //     $scope.setupFileListener();
        // };

        // // Navegación de pestañas (Con reinicio automático de zoom y pan por ergonomía)
        $scope.setTab = function (tabName) {
            $scope.currentTab = tabName;

        };

        // // Notificaciones Toast no bloqueantes
        // $scope.showNotification = function(title, message, type) {
        //     var toast = {
        //         title: title,
        //         message: message,
        //         type: type || 'info'
        //     };
        //     $scope.toasts.push(toast);

        //     setTimeout(function() {
        //         $scope.$apply(function() {
        //             var index = $scope.toasts.indexOf(toast);
        //             if (index !== -1) {
        //                 $scope.toasts.splice(index, 1);
        //             }
        //         });
        //     }, 6000);
        // };

        // $scope.removeToast = function(index) {
        //     $scope.toasts.splice(index, 1);
        // };

        // // --- Controles y modificadores de Zoom / Paneo ---
        // $scope.zoomIn = function() {
        //     $scope.zoomLevel = Math.min($scope.zoomLevel + 0.15, 3.0);
        // };

        // $scope.zoomOut = function() {
        //     $scope.zoomLevel = Math.max($scope.zoomLevel - 0.15, 0.3);
        // };

        // $scope.resetZoom = function() {
        //     $scope.zoomLevel = 1.0;
        //     $scope.panX = 0;
        //     $scope.panY = 0;
        // };

        // // Manejador del paneo en el fondo del SVG
        // $scope.onSvgBgMouseDown = function(event) {
        //     $scope.isPanning = true;
        //     $scope.panStartX = event.clientX - $scope.panX;
        //     $scope.panStartY = event.clientY - $scope.panY;
        //     event.preventDefault();
        // };

        // // Gestión de físicas de arrastre y desplazamiento zoom/pan coordinado
        // $scope.onSvgMouseDown = function(event, node) {
        //     $scope.draggedNode = node;

        //     var svgId = $scope.currentTab === 'topology' ? 'topologysvg' : 'portstopologysvg';
        //     var svg = document.getElementById(svgId);
        //     var rect = svg.getBoundingClientRect();

        //     var x = event.clientX - rect.left;
        //     var y = event.clientY - rect.top;

        //     // Conversión de coordenadas de la pantalla a coordenadas del Viewbox del SVG (1000x600)
        //     var normX = (x / rect.width) * 1000;
        //     var normY = (y / rect.height) * 600;

        //     // Corrección del arrastre bajo transformaciones de Zoom y Paneo
        //     var svgX = (normX - $scope.panX) / $scope.zoomLevel;
        //     var svgY = (normY - $scope.panY) / $scope.zoomLevel;

        //     $scope.dragOffsetX = node.x - svgX;
        //     $scope.dragOffsetY = node.y - svgY;

        //     event.preventDefault();
        //     event.stopPropagation();
        // };

        // $scope.onSvgMouseMove = function(event) {
        //     var svgId = $scope.currentTab === 'topology' ? 'topologysvg' : 'portstopologysvg';
        //     var svg = document.getElementById(svgId);
        //     if (!svg) return;

        //     if ($scope.draggedNode) {
        //         var rect = svg.getBoundingClientRect();
        //         var x = event.clientX - rect.left;
        //         var y = event.clientY - rect.top;

        //         var normX = (x / rect.width) * 1000;
        //         var normY = (y / rect.height) * 600;

        //         var svgX = (normX - $scope.panX) / $scope.zoomLevel;
        //         var svgY = (normY - $scope.panY) / $scope.zoomLevel;

        //         $scope.draggedNode.x = svgX + $scope.dragOffsetX;
        //         $scope.draggedNode.y = svgY + $scope.dragOffsetY;

        //         // Limitar posiciones lógicas para no desbordar el lienzo
        //         if ($scope.draggedNode.x < 15) $scope.draggedNode.x = 15;
        //         if ($scope.draggedNode.x > 985) $scope.draggedNode.x = 985;
        //         if ($scope.draggedNode.y < 15) $scope.draggedNode.y = 15;
        //         if ($scope.draggedNode.y > 585) $scope.draggedNode.y = 585;
        //     } else if ($scope.isPanning) {
        //         $scope.panX = event.clientX - $scope.panStartX;
        //         $scope.panY = event.clientY - $scope.panStartY;
        //     }
        // };

        // $scope.onSvgMouseUp = function(event) {
        //     $scope.draggedNode = null;
        //     $scope.isPanning = false;
        // };

        // $scope.onSvgWheel = function(event) {
        //     event.preventDefault();
        //     var zoomFactor = 1.1;
        //     if (event.deltaY > 0) {
        //         $scope.zoomLevel = Math.max($scope.zoomLevel / zoomFactor, 0.3);
        //     } else {
        //         $scope.zoomLevel = Math.min($scope.zoomLevel * zoomFactor, 3.0);
        //     }
        //     $scope.$apply();
        // };

        // // --- Escuchador e importador de archivos XML de Nmap ---
        // $scope.setupFileListener = function() {
        //     setTimeout(function() {
        //         var fileInput = document.getElementById('fileInput');
        //         if (fileInput) {
        //             fileInput.addEventListener('change', function(event) {
        //                 var file = event.target.files[0];
        //                 if (!file) return;

        //                 var reader = new FileReader();
        //                 reader.onload = function(e) {
        //                     var text = e.target.result;
        //                     $scope.$apply(function() {
        //                         if ($scope.isLocalMode) {
        //                             var parsed = $scope.parseNmapXMLClient(text);
        //                             if (parsed && parsed.length > 0) {
        //                                 $scope.hosts = parsed;
        //                                 $scope.updateAll();
        //                                 $scope.showNotification("Archivo Cargado", "El reporte fue importado localmente de forma exitosa.", "success");
        //                             } else {
        //                                 $scope.showNotification("Error", "No se detectaron hosts activos en el XML.", "error");
        //                             }
        //                         } else {
        //                             var formData = new FormData();
        //                             formData.append('file', file);
        //                             $http.post('http://127.0.0.1:5000/api/parse/'+ProjectService.getProject(), formData, {
        //                                 transformRequest: angular.identity,
        //                                 headers: {'Content-Type': undefined}
        //                             }).then(function(response) {
        //                                 $scope.init();
        //                                 //$scope.hosts = response.data;
        //                                 //$scope.updateAll();
        //                                 $scope.showNotification("Archivo Analizado", "Reporte de red mapeado correctamente por la API.", "success");
        //                             }, function(error) {
        //                                 var errMsg = (error.data && error.data.error) ? error.data.error : "Error al procesar el archivo.";
        //                                 $scope.showNotification("Error", errMsg, "error");
        //                             });
        //                         }
        //                     });
        //                 };
        //                 reader.readAsText(file);
        //             });
        //         }
        //     }, 500);
        // };

        // // Parser alternativo en el lado del cliente (Client-side fallback)
        // $scope.parseNmapXMLClient = function(xmlText) {
        //     try {
        //         var parser = new DOMParser();
        //         var xmlDoc = parser.parseFromString(xmlText, "text/xml");
        //         var hostsElements = xmlDoc.getElementsByTagName("host");
        //         var parsedHosts = [];

        //         for (var i = 0; i < hostsElements.length; i++) {
        //             var hostEl = hostsElements[i];
        //             var statusEl = hostEl.getElementsByTagName("status")[0];
        //             var statusState = statusEl ? statusEl.getAttribute("state") : "down";
        //             if (statusState !== "up") continue;

        //             var ip = "IP Desconocida";
        //             var addressElements = hostEl.getElementsByTagName("address");
        //             for (var j = 0; j < addressElements.length; j++) {
        //                 if (addressElements[j].getAttribute("addrtype") === "ipv4") {
        //                     ip = addressElements[j].getAttribute("addr");
        //                     break;
        //                 }
        //             }

        //             var portsList = [];
        //             var portElements = hostEl.getElementsByTagName("port");
        //             for (var k = 0; k < portElements.length; k++) {
        //                 var portEl = portElements[k];
        //                 var portId = parseInt(portEl.getAttribute("portid") || "0");
        //                 var protocol = portEl.getAttribute("protocol") || "tcp";

        //                 var stateEl = portEl.getElementsByTagName("state")[0];
        //                 var state = stateEl ? stateEl.getAttribute("state") : "closed";

        //                 if (state === "open") {
        //                     var serviceEl = portEl.getElementsByTagName("service")[0];
        //                     var serviceName = serviceEl ? (serviceEl.getAttribute("name") || "unknown") : "unknown";
        //                     var product = serviceEl ? (serviceEl.getAttribute("product") || "") : "";
        //                     var version = serviceEl ? (serviceEl.getAttribute("version") || "") : "";

        //                     var matchedVectors = [];
        //                     var highestSeverity = "Low";
        //                     var severityMap = { "Critical": 4, "High": 3, "Medium": 2, "Low": 1 };

        //                     for (var v = 0; v < localVulnerabilities.length; v++) {
        //                         var vuln = localVulnerabilities[v];
        //                         if (vuln.port === portId || vuln.service.toLowerCase() === serviceName.toLowerCase()) {
        //                             matchedVectors.push({
        //                                 cve: vuln.cve,
        //                                 title: vuln.title,
        //                                 severity: vuln.severity,
        //                                 complexity: vuln.complexity,
        //                                 description: vuln.description,
        //                                 mitigation: vuln.mitigation
        //                             });

        //                             if (severityMap[vuln.severity] > (severityMap[highestSeverity] || 1)) {
        //                                 highestSeverity = vuln.severity;
        //                             }
        //                         }
        //                     }

        //                     portsList.push({
        //                         id: ip + "-" + portId,
        //                         port: portId,
        //                         protocol: protocol,
        //                         state: state,
        //                         service: serviceName,
        //                         product: product,
        //                         version: version,
        //                         riskLevel: matchedVectors.length > 0 ? highestSeverity : "Low",
        //                         attackVectors: matchedVectors
        //                     });
        //                 }
        //             }

        //             var osName = "Dispositivo Genérico";
        //             var osMatch = hostEl.getElementsByTagName("osmatch")[0];
        //             if (osMatch) {
        //                 osName = osMatch.getAttribute("name");
        //             }

        //             var osFamily = "Unknown";
        //             var osClass = hostEl.getElementsByTagName("osclass")[0];
        //             var osClassFamily = osClass ? (osClass.getAttribute("osfamily") || "").toLowerCase() : "";

        //             if (osClassFamily.indexOf("windows") !== -1 || osName.toLowerCase().indexOf("windows") !== -1) {
        //                 osFamily = "Windows";
        //             } else if (osClassFamily.indexOf("linux") !== -1 || osName.toLowerCase().indexOf("linux") !== -1 || osName.toLowerCase().indexOf("ubuntu") !== -1) {
        //                 osFamily = "Linux";
        //             } else if (osClassFamily.indexOf("macos") !== -1 || osClassFamily.indexOf("apple") !== -1 || osName.toLowerCase().indexOf("apple") !== -1) {
        //                 osFamily = "Apple";
        //             } else if (osClassFamily.indexOf("cisco") !== -1 || osClassFamily.indexOf("ios") !== -1) {
        //                 osFamily = "Cisco";
        //             }

        //             parsedHosts.push({
        //                 ip: ip,
        //                 status: statusState,
        //                 os: osName,
        //                 osFamily: osFamily,
        //                 ports: portsList
        //             });
        //         }
        //         return parsedHosts;
        //     } catch(e) {
        //         console.error("Error al analizar el XML de forma local:", e);
        //         return [];
        //     }
        // };

        // // --- Filtro no estricto para la vista del Mapa de Hosts ---
        // $scope.getFilteredHostsForGraph = function() {
        //     var q = $scope.filters.hostSearchQuery ? $scope.filters.hostSearchQuery.toLowerCase().trim() : '';
        //     if (!q) return $scope.hosts;
        //     return $scope.hosts.filter(function(host) {
        //         return host.ip.toLowerCase().includes(q);
        //     });
        // };

        // // --- Filtro no estricto para la vista del Mapa por Puertos ---
        // $scope.getUniquePortsListRaw = function() {
        //     var portsMap = {};
        //     $scope.hosts.forEach(function(host) {
        //         host.ports.forEach(function(port) {
        //             var pKey = port.port + '/' + port.protocol;
        //             if (!portsMap[pKey]) {
        //                 portsMap[pKey] = {
        //                     key: pKey,
        //                     port: port.port,
        //                     protocol: port.protocol,
        //                     service: port.service,
        //                     riskLevel: port.riskLevel,
        //                     hosts: []
        //                 };
        //             }
        //             if (!portsMap[pKey].hosts.find(function(h) { return h.ip === host.ip; })) {
        //                 portsMap[pKey].hosts.push(host);
        //             }
        //         });
        //     });
        //     return Object.values(portsMap);
        // };

        // $scope.getFilteredPortsForGraph = function() {
        //     var ports = $scope.getUniquePortsListRaw();
        //     var q = $scope.filters.portSearchQuery ? $scope.filters.portSearchQuery.toLowerCase().trim() : '';
        //     if (!q) return ports;
        //     return ports.filter(function(portObj) {
        //         return portObj.port.toString().includes(q);
        //     });
        // };

        // // Acciones de actualización por cambio en los inputs locales
        // $scope.updateHostGraph = function() {
        //     $scope.graphPage = 0; 
        //     $scope.graphData = $scope.calculateNetworkLayout($scope.hosts);
        // };

        // $scope.updatePortsGraph = function() {
        //     $scope.portsGraphPage = 0;
        //     $scope.portsGraphData = $scope.calculatePortsLayout($scope.hosts);
        // };

        // // --- RENDERIZACIÓN DE HOSTS (Host-Centric Layout) ---
        // $scope.calculateNetworkLayout = function(hosts) {
        //     var nodes = [];
        //     var links = [];

        //     if (!hosts || hosts.length === 0) return { nodes: nodes, links: links };

        //     var queryFiltered = $scope.getFilteredHostsForGraph();
        //     var totalFiltered = queryFiltered.length;
        //     if (totalFiltered === 0) return { nodes: nodes, links: links };

        //     var maxPage = Math.ceil(totalFiltered / $scope.pageSize) - 1;
        //     if ($scope.graphPage > maxPage) {
        //         $scope.graphPage = Math.max(0, maxPage);
        //     }

        //     var start = $scope.graphPage * $scope.pageSize;
        //     var end = Math.min(start + $scope.pageSize, totalFiltered);
        //     var pagedHosts = queryFiltered.slice(start, end);

        //     var hostCount = pagedHosts.length;

        //     pagedHosts.forEach(function(host, hIdx) {
        //         var angle = (hIdx / hostCount) * 2 * Math.PI;
        //         var hostDistance = 160; 

        //         var hx = 500 + Math.cos(angle) * hostDistance;
        //         var hy = 300 + Math.sin(angle) * hostDistance;

        //         var hostNode = {
        //             id: host.ip,
        //             label: host.ip,
        //             type: 'host',
        //             os: host.osFamily,
        //             x: hx,
        //             y: hy,
        //             size: 18,
        //             data: host
        //         };
        //         nodes.push(hostNode);

        //         var ports = host.ports;
        //         var portCount = ports.length;

        //         ports.forEach(function(port, pIdx) {
        //             var pAngle = angle;
        //             if (portCount > 1) {
        //                 var spreadArc = 1.3; 
        //                 pAngle = angle - (spreadArc / 2) + (pIdx / (portCount - 1)) * spreadArc;
        //             }

        //             var portDistance = 80;
        //             var px = hx + Math.cos(pAngle) * portDistance;
        //             var py = hy + Math.sin(pAngle) * portDistance;

        //             var portNode = {
        //                 id: host.ip + '-' + port.port,
        //                 label: port.port + '/' + port.protocol,
        //                 type: 'port',
        //                 riskLevel: port.riskLevel,
        //                 x: px,
        //                 y: py,
        //                 size: 11,
        //                 data: port
        //             };
        //             nodes.push(portNode);

        //             links.push({
        //                 source: hostNode,
        //                 target: portNode,
        //                 type: 'port-link'
        //             });
        //         });
        //     });

        //     return { nodes: nodes, links: links };
        // };

        // // --- RENDERIZACIÓN POR PUERTOS (Port-Centric Layout) ---
        // $scope.calculatePortsLayout = function(hosts) {
        //     var nodes = [];
        //     var links = [];

        //     if (!hosts || hosts.length === 0) return { nodes: nodes, links: links };

        //     var uniquePorts = $scope.getFilteredPortsForGraph();
        //     var totalPorts = uniquePorts.length;
        //     if (totalPorts === 0) return { nodes: nodes, links: links };

        //     var maxPage = Math.ceil(totalPorts / $scope.portsPageSize) - 1;
        //     if ($scope.portsGraphPage > maxPage) {
        //         $scope.portsGraphPage = Math.max(0, maxPage);
        //     }

        //     var start = $scope.portsGraphPage * $scope.portsPageSize;
        //     var end = Math.min(start + $scope.portsPageSize, totalPorts);
        //     var pagedPorts = uniquePorts.slice(start, end);

        //     var portCount = pagedPorts.length;

        //     pagedPorts.forEach(function(portObj, pIdx) {
        //         var angle = (pIdx / portCount) * 2 * Math.PI;
        //         var portDistance = 165; 

        //         var px = 500 + Math.cos(angle) * portDistance;
        //         var py = 300 + Math.sin(angle) * portDistance;

        //         var portNode = {
        //             id: 'pnode-' + portObj.key,
        //             label: portObj.key,
        //             type: 'port',
        //             riskLevel: portObj.riskLevel,
        //             x: px,
        //             y: py,
        //             size: 14,
        //             data: portObj 
        //         };
        //         nodes.push(portNode);

        //         var connectedHosts = portObj.hosts;
        //         var hostCount = connectedHosts.length;

        //         connectedHosts.forEach(function(host, hIdx) {
        //             var hAngle = angle;
        //             if (hostCount > 1) {
        //                 var spreadArc = 1.3;
        //                 hAngle = angle - (spreadArc / 2) + (hIdx / (hostCount - 1)) * spreadArc;
        //             }

        //             var hostDistance = 75;
        //             var hx = px + Math.cos(hAngle) * hostDistance;
        //             var hy = py + Math.sin(hAngle) * hostDistance;

        //             var hostNode = {
        //                 id: 'phostnode-' + portObj.key + '-' + host.ip,
        //                 label: host.ip,
        //                 type: 'host',
        //                 os: host.osFamily,
        //                 x: hx,
        //                 y: hy,
        //                 size: 12,
        //                 data: host,
        //                 associatedPort: portObj
        //             };
        //             nodes.push(hostNode);

        //             links.push({
        //                 source: portNode,
        //                 target: hostNode,
        //                 type: 'host-link'
        //             });
        //         });
        //     });

        //     return { nodes: nodes, links: links };
        // };

        // // --- PROCESADOR DE DESCARGAS POR SERVICIO ---
        // $scope.calculateServicesSummary = function() {
        //     var servicesMap = {};
        //     $scope.hosts.forEach(function(host) {
        //         host.ports.forEach(function(port) {
        //             var sName = port.service.toLowerCase().trim();
        //             var pProto = port.protocol.toLowerCase().trim();
        //             var key = sName + '/' + pProto;

        //             if (!servicesMap[key]) {
        //                 servicesMap[key] = {
        //                     name: port.service,
        //                     protocol: port.protocol,
        //                     ports: [],
        //                     hosts: []
        //                 };
        //             }

        //             if (servicesMap[key].ports.indexOf(port.port) === -1) {
        //                 servicesMap[key].ports.push(port.port);
        //             }

        //             if (!servicesMap[key].hosts.find(function(h) { return h.ip === host.ip; })) {
        //                 servicesMap[key].hosts.push(host);
        //             }
        //         });
        //     });
        //     return Object.values(servicesMap);
        // };

        // // Generador dinámico de descargas en archivos de texto (.txt) plano
        // $scope.downloadHostsForService = function(service) {
        //     if (!service || !service.hosts || service.hosts.length === 0) return;

        //     var timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
        //     var fileContent = "";
        //     var ips = service.hosts.map(function(h) { return h.ip; });
        //     fileContent += ips.join('\n');

        //     var blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8;' });
        //     var fileName = "hosts_" + service.name.toLowerCase() + "_" + service.protocol.toLowerCase() + ".txt";

        //     var link = document.createElement("a");
        //     var url = URL.createObjectURL(blob);
        //     link.setAttribute("href", url);
        //     link.setAttribute("download", fileName);
        //     link.style.visibility = 'hidden';
        //     document.body.appendChild(link);
        //     link.click();
        //     document.body.removeChild(link);

        //     $scope.showNotification("Descarga Exitosa", "Se generó '" + fileName + "' con " + service.hosts.length + " hosts.", "success");
        // };

        // // Extractor auxiliar de puertos únicos mapeados con sus hosts asociados (Utilizado en inventario global)
        // $scope.getUniquePortsList = function() {
        //     var portsMap = {};
        //     var queryFiltered = $scope.getFilteredHosts();

        //     queryFiltered.forEach(function(host) {
        //         host.ports.forEach(function(port) {
        //             var pKey = port.port + '/' + port.protocol;
        //             if (!portsMap[pKey]) {
        //                 portsMap[pKey] = {
        //                     key: pKey,
        //                     port: port.port,
        //                     protocol: port.protocol,
        //                     service: port.service,
        //                     riskLevel: port.riskLevel,
        //                     hosts: []
        //                 };
        //             }
        //             if (!portsMap[pKey].hosts.find(function(h) { return h.ip === host.ip; })) {
        //                 portsMap[pKey].hosts.push(host);
        //             }
        //         });
        //     });

        //     return Object.values(portsMap);
        // };

        // // Helpers de paginación del gráfico de Hosts
        // $scope.nextGraphPage = function() {
        //     if ($scope.graphPage < $scope.getTotalGraphPages() - 1) {
        //         $scope.graphPage++;
        //         $scope.graphData = $scope.calculateNetworkLayout($scope.hosts);
        //     }
        // };

        // $scope.prevGraphPage = function() {
        //     if ($scope.graphPage > 0) {
        //         $scope.graphPage--;
        //         $scope.graphData = $scope.calculateNetworkLayout($scope.hosts);
        //     }
        // };

        // $scope.getTotalGraphPages = function() {
        //     var total = $scope.getFilteredHostsForGraph().length;
        //     return Math.ceil(total / $scope.pageSize);
        // };

        // $scope.getEndIndex = function() {
        //     var total = $scope.getFilteredHostsForGraph().length;
        //     return Math.min(($scope.graphPage + 1) * $scope.pageSize, total);
        // };

        // $scope.getFilteredHostsCount = function() {
        //     return $scope.getFilteredHostsForGraph().length;
        // };

        // // Helpers de paginación del gráfico de Puertos
        // $scope.nextPortsGraphPage = function() {
        //     if ($scope.portsGraphPage < $scope.getTotalPortsGraphPages() - 1) {
        //         $scope.portsGraphPage++;
        //         $scope.portsGraphData = $scope.calculatePortsLayout($scope.hosts);
        //     }
        // };

        // $scope.prevPortsGraphPage = function() {
        //     if ($scope.portsGraphPage > 0) {
        //         $scope.portsGraphPage--;
        //         $scope.portsGraphData = $scope.calculatePortsLayout($scope.hosts);
        //     }
        // };

        // $scope.getTotalPortsGraphPages = function() {
        //     var total = $scope.getFilteredPortsForGraph().length;
        //     return Math.ceil(total / $scope.portsPageSize);
        // };

        // $scope.getPortsEndIndex = function() {
        //     var total = $scope.getFilteredPortsForGraph().length;
        //     return Math.min(($scope.portsGraphPage + 1) * $scope.portsPageSize, total);
        // };

        // $scope.getFilteredPortsCount = function() {
        //     return $scope.getFilteredPortsForGraph().length;
        // };

        // $scope.getFilteredHosts = function() {
        //     var q = $scope.filters.searchQuery ? $scope.filters.searchQuery.toLowerCase().trim() : '';
        //     if (!q) return $scope.hosts;

        //     return $scope.hosts.filter(function(host) {
        //         var matchesHost = host.ip.toLowerCase().includes(q) || host.os.toLowerCase().includes(q);
        //         var matchesPort = host.ports.some(function(port) {
        //             return port.port.toString().includes(q) || 
        //                    port.service.toLowerCase().includes(q) || 
        //                    (port.product && port.product.toLowerCase().includes(q));
        //         });
        //         return matchesHost || matchesPort;
        //     });
        // };

        // // Actualización global de datos y modelos
        // $scope.updateAll = function() {
        //     $scope.graphData = $scope.calculateNetworkLayout($scope.hosts);
        //     $scope.portsGraphData = $scope.calculatePortsLayout($scope.hosts);
        //     $scope.servicesSummary = $scope.calculateServicesSummary(); // Actualizar descargas
        //     $scope.applyFilters();
        //     $scope.calculateStats();
        //     $scope.updateActiveTarget();
        // };

        // $scope.applyFilters = function() {
        //     var q = $scope.filters.searchQuery ? $scope.filters.searchQuery.toLowerCase().trim() : '';
        //     var rows = [];

        //     $scope.hosts.forEach(function(host) {
        //         host.ports.forEach(function(port) {
        //             if (!q || 
        //                 host.ip.toLowerCase().includes(q) || 
        //                 host.os.toLowerCase().includes(q) || 
        //                 port.service.toLowerCase().includes(q) || 
        //                 port.port.toString().includes(q) ||
        //                 (port.product && port.product.toLowerCase().includes(q))
        //             ) {
        //                 rows.push({
        //                     hostIp: host.ip,
        //                     os: host.os,
        //                     osFamily: host.osFamily,
        //                     port: port.port,
        //                     protocol: port.protocol,
        //                     service: port.service,
        //                     product: port.product,
        //                     version: port.version,
        //                     riskLevel: port.riskLevel
        //                 });
        //             }
        //         });
        //     });

        //     $scope.filteredTableRows = rows;
        //     $scope.graphData = $scope.calculateNetworkLayout($scope.hosts);
        //     $scope.portsGraphData = $scope.calculatePortsLayout($scope.hosts);
        // };

        // $scope.calculateStats = function() {
        //     var totalPorts = 0;
        //     $scope.hosts.forEach(function(h) {
        //         totalPorts += h.ports.length;
        //     });

        //     $scope.stats = {
        //         totalHosts: $scope.hosts.length,
        //         totalPorts: totalPorts,
        //         avgPortsPerHost: $scope.hosts.length ? (totalPorts / $scope.hosts.length).toFixed(1) : '0'
        //     };
        // };

        // $scope.updateActiveTarget = function() {
        //     if ($scope.selectedTargetPort && $scope.selectedTargetHost) {
        //         $scope.activeTarget = {
        //             ip: $scope.selectedTargetHost.ip,
        //             os: $scope.selectedTargetHost.os,
        //             osFamily: $scope.selectedTargetHost.osFamily,
        //             activePort: $scope.selectedTargetPort
        //         };
        //     } else {
        //         $scope.activeTarget = null;
        //     }
        // };

        // // --- Controladores de Selección e Interacción de Nodos ---

        // // Selección en la vista de Hosts
        // $scope.selectNode = function(node) {
        //     if ($scope.draggedNode || $scope.isPanning) return; 
        //     $scope.selectedNodeId = node.id;

        //     if (node.type === 'port') {
        //         var parentHost = null;
        //         for (var i = 0; i < $scope.graphData.links.length; i++) {
        //             var link = $scope.graphData.links[i];
        //             if (link.target.id === node.id) {
        //                 parentHost = link.source.data;
        //                 break;
        //             }
        //         }
        //         if (parentHost) {
        //             $scope.selectedTargetHost = parentHost;
        //             $scope.selectedTargetPort = node.data;
        //         }
        //     } else if (node.type === 'host') {
        //         $scope.selectedTargetHost = node.data;
        //         $scope.selectedTargetPort = node.data.ports.length > 0 ? node.data.ports[0] : null;
        //     } else {
        //         $scope.selectedTargetHost = null;
        //         $scope.selectedTargetPort = null;
        //     }
        //     $scope.updateActiveTarget();
        // };

        // // Selección en la nueva vista de Puertos
        // $scope.selectNodePorts = function(node) {
        //     if ($scope.draggedNode || $scope.isPanning) return;
        //     $scope.selectedNodeId = node.id;

        //     if (node.type === 'host') {
        //         $scope.selectedTargetHost = node.data;
        //         var assocPort = node.associatedPort;
        //         var matchedPort = node.data.ports.find(function(p) {
        //             return p.port === assocPort.port && p.protocol === assocPort.protocol;
        //         });
        //         $scope.selectedTargetPort = matchedPort || node.data.ports[0];
        //     } else if (node.type === 'port') {
        //         if (node.data.hosts && node.data.hosts.length > 0) {
        //             $scope.selectedTargetHost = node.data.hosts[0];
        //             var portNum = node.data.port;
        //             var matchedPort = $scope.selectedTargetHost.ports.find(function(p) {
        //                 return p.port === portNum;
        //             });
        //             $scope.selectedTargetPort = matchedPort || $scope.selectedTargetHost.ports[0];
        //         }
        //     } else {
        //         $scope.selectedTargetHost = null;
        //         $scope.selectedTargetPort = null;
        //     }
        //     $scope.updateActiveTarget();
        // };

        // $scope.deselectTarget = function() {
        //     $scope.selectedNodeId = null;
        //     $scope.selectedTargetHost = null;
        //     $scope.selectedTargetPort = null;
        //     $scope.activeTarget = null;
        // };

        // $scope.selectPortAndOpenSidepanel = function(hostIp, portNumber) {
        //     var matchedHost = $scope.hosts.find(function(h) { return h.ip === hostIp; });
        //     if (matchedHost) {
        //         var matchedPort = matchedHost.ports.find(function(p) { return p.port === portNumber; });
        //         if (matchedPort) {
        //             $scope.selectedTargetHost = matchedHost;
        //             $scope.selectedTargetPort = matchedPort;
        //             $scope.selectedNodeId = hostIp + '-' + portNumber;
        //             $scope.updateActiveTarget();
        //         }
        //     }
        // };

        // // Acciones de redirección directa desde la Tabla
        // $scope.selectPortAndSwitchToGraph = function(hostIp, portNumber) {
        //     $scope.selectPortAndOpenSidepanel(hostIp, portNumber);
        //     $scope.setTab('topology');
        //     $scope.showNotification("Host Enfocado", "Redireccionado al mapa de hosts para el servidor " + hostIp + " en puerto " + portNumber + ".", "info");
        // };

        // $scope.selectPortAndSwitchToPortsGraph = function(hostIp, portNumber) {
        //     $scope.selectPortAndOpenSidepanel(hostIp, portNumber);

        //     // Aseguramos que el nodo del mapa de puertos esté marcado como seleccionado
        //     var pKey = portNumber + '/tcp'; 
        //     $scope.selectedNodeId = 'phostnode-' + pKey + '-' + hostIp;

        //     $scope.setTab('ports-topology');
        //     $scope.showNotification("Puerto Enfocado", "Redireccionado al mapa por puertos para el puerto " + portNumber + " en el host " + hostIp + ".", "warning");
        // };

        // // --- Métodos de Coloración y Etiquetas ---
        // $scope.getPortColor = function(riskLevel) {
        //     switch (riskLevel) {
        //         case 'Critical': return '#ef4444';
        //         case 'High': return '#f97316';
        //         case 'Medium': return '#f59e0b';
        //         case 'Low': return '#3b82f6';
        //         default: return '#64748b';
        //     }
        // };

        // $scope.getPortStroke = function(riskLevel) {
        //     switch (riskLevel) {
        //         case 'Critical': return '#b91c1c';
        //         case 'High': return '#c2410c';
        //         case 'Medium': return '#b45309';
        //         case 'Low': return '#1d4ed8';
        //         default: return '#475569';
        //     }
        // };

        // $scope.getSeverityBadgeClass = function(severity) {
        //     switch (severity) {
        //         case 'Critical': return 'bg-red-500/20 border border-red-500/40 text-red-400';
        //         case 'High': return 'bg-orange-500/20 border border-orange-500/40 text-orange-400';
        //         case 'Medium': return 'bg-amber-500/20 border border-amber-500/40 text-amber-400';
        //         default: return 'bg-blue-500/20 border border-blue-500/40 text-blue-400';
        //     }
        // };

        // $scope.getPortBadgeClass = function(riskLevel) {
        //     switch (riskLevel) {
        //         case 'Critical': return 'bg-red-500/10 text-red-400 border border-red-500/30';
        //         case 'High': return 'bg-orange-500/10 text-orange-400 border border-orange-500/30';
        //         case 'Medium': return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
        //         case 'Low': return 'bg-blue-500/10 text-blue-400 border border-blue-500/30';
        //         default: return 'bg-slate-500/10 text-slate-400 border border-slate-500/30';
        //     }
        // };

        // $scope.init();
    }]);