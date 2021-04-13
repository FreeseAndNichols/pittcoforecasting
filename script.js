require([
"esri/config",
"esri/WebMap",
"esri/views/MapView",
"esri/layers/FeatureLayer",
"esri/widgets/Sketch/SketchViewModel",
"esri/layers/GraphicsLayer",
"esri/widgets/Expand",
"esri/widgets/Legend",
"esri/core/promiseUtils",
"esri/renderers/UniqueValueRenderer",
"esri/renderers/ClassBreaksRenderer",
"esri/widgets/BasemapToggle",
"esri/portal/Portal",
"esri/identity/OAuthInfo",
"esri/identity/IdentityManager",
"esri/portal/PortalQueryParams",
], function (esriConfig, WebMap, MapView, FeatureLayer, SketchViewModel, GraphicsLayer, Expand, Legend,
promiseUtils, UniqueValueRenderer, ClassBreaksRenderer, BasemapToggle, Portal, OAuthInfo, esriId,
PortalQueryParams) {

// var info = new OAuthInfo({
//   appId: "aBA2fHwkOHXJYtax",
//   popup: false
// });

// esriId.registerOAuthInfos([info]);

// document.getElementById("signIn").addEventListener("click", function() {
//   const creds = esriId.getCredential(info.portalUrl + "/sharing");
//   console.log(creds['Promise'])
// });

const sketchLayer = new GraphicsLayer();

const map = new WebMap({
    portalItem: {
    id: "71f618cdbf414cc19663b0fe5f2fef20"
    }
});

const view = new MapView({
    container: "viewDiv",
    map: map
});


// // SEE THIS FOR AUTH STUFF!
// // enable button
// document.getElementById("startForecast").disabled = false;
// // remove tooltip 
// document.getElementById("startForecastDiv").classList.remove("tooltip");
// // hide tooltip text
// document.getElementById("tooltiptextid").hidden = true

view.map.add(sketchLayer);
document.getElementById('queryDiv').style.display = "block";
view.ui.add(queryDiv, 'bottom-left');
view.ui.add(resultDiv, "top-right");
/* document.getElementById('tableDiv').style.display = 'block'; */
let sceneLayer = null;
let sceneLayerView = null;

var renderersByField = {
    ZONING: zoningRenderer,
    WATER: waterRenderer,
    SEWER: sewerRenderer,
    UTILITIES: utilitiesRender
}

//Generates renderers based on the input field name.

function getRenderer(fieldName) {
    // If the renderer is already generated, then return it
    if (renderersByField[fieldName]) {
    return promiseUtils.resolve(renderersByField[fieldName]);
    }

    if (fieldName === "ZONING") {
    return zoningRenderer
    };
    if (fieldName === "WATER") {
    return waterRenderer
    };
    if (fieldName === "SEWER") {
    return sewerRenderer
    };
    if (fieldName == "UTILITIES") {
    return utilitiesRender
    }
};

map.load().then(function () {
    sceneLayer = map.allLayers.find(function (layer) {
    if (layer.title === "sewer_and_water") {
        map.add(layer)
        return layer.title === "sewer_and_water"
    }
    });

    map.removeAll();
    map.add(sceneLayer);
    sceneLayer.outFields = ["waterUser", "sewerUser", "sewerAndWater", "waterUsage", "zone"];
    sceneLayer.renderer = zoningRenderer
    view.whenLayerView(sceneLayer).then(function (layerView) {
    sceneLayerView = layerView;
    });
    
    const legend = new Legend({
    view: view,
    layerInfos: [{
        layer: sceneLayer,
        title: 'Pittsylvania County Utilities Dashboard Legend'
    }]
    });

    const basemapToggle = new BasemapToggle({
    view: view,
    content: basemapGalleryDiv,
    nextBasemap: 'hybrid',
    });

    basemapExpand = new Expand({
    view: view,
    content: basemapToggle,
    group: "upper_left_expand",
    expandIconClass: 'esri-icon-basemap'
    })
    legendExpand = new Expand({
    view: view,
    content: legend,
    group: "upper_left_expand"
    }); 
    radioExpand = new Expand({
    view: view,
    content: paneDiv,
    expandIconClass: 'esri-icon-layers',
    group: 'upper_left_expand'
    });
    view.ui.add([legendExpand, basemapExpand, radioExpand], "top-left")
    document.getElementById('editArea').style.display = 'none';
    document.getElementById('devProjectionsArea').style.display = 'none';

});

const radios = document.getElementsByName("renderer");
for (var i = 0; i < radios.length; i++) {
    radios[i].addEventListener("change", function (event) {
    var fieldName = event.target.value;
    getRenderer(fieldName)
        .then(function (renderer) {
        sceneLayer.renderer = renderer;
        })
        .catch(function (error) {
        console.log("error: ", error);
        });
    })
};

// use SketchViewModel to draw polygons that are used as a query
let sketchGeometry = null;
const sketchViewModel = new SketchViewModel({
    layer: sketchLayer,
    defaultUpdateOptions: {
    tool: "reshape",
    toggleToolOnClick: false
    },
    view: view,
    defaultCreateOptions: {
    hasZ: false
    }
});
sketchViewModel.on("create", function (event) {
    if (event.state === "complete") {
    sketchGeometry = event.graphic.geometry;
    runQuery();
    }
});

sketchViewModel.on("update", function (event) {
    if (event.state === "complete") {
    sketchGeometry = event.graphics[0].geometry;
    runQuery();
    }
});
document
    .getElementById("polygon-geometry-button")
    .addEventListener("click", geometryButtonsClickHandler);
document
    .getElementById("point-geometry-button")
    .addEventListener("click", geometryButtonsClickHandler)

function geometryButtonsClickHandler(event) {
    const geometryType = event.target.value;
    clearGeometry();
    sketchViewModel.create(geometryType);
}
document
    .getElementById("clearGeometry")
    .addEventListener("click", clearGeometry);

function layerSwap() {
    map.removeAll()
    sceneLayer = new FeatureLayer({
    url: "https://services.arcgis.com/t6fsA0jUdL7JkKG2/arcgis/rest/services/sewer_and_water_DEV/FeatureServer",
    outFields: ["waterDemand_2025","waterFactor_2025","sewerLoad_2025","sewerFactor_2025", "landUse_2025",
                "waterDemand_2030","waterFactor_2030","sewerLoad_2030","sewerFactor_2030", "landUse_2030",
                "waterDemand_2040","waterFactor_2040","sewerLoad_2040","sewerFactor_2030", "landUse_2040",
                "zone","sewerUser","waterUser","sewerAndWater", "waterUsage"],
    id: "devLayer"
    });
    map.add(sceneLayer);
    sceneLayer.renderer = zoningRenderer
    document.getElementById('zoningRadio').checked = true;
    view.whenLayerView(sceneLayer).then((layerView) => sceneLayerView = layerView);
    console.log(sceneLayer.outFields)
    document.getElementById("startForecast").disabled = false;
    document.getElementById("tooltiptextid").hidden = true;
    document.getElementById("startForecastDiv").classList.remove("tooltip");
    document.getElementById("signIn").disabled = true
    document.getElementById("signIn").style.cursor = "default";
    document.getElementById("signIn").innerHTML = "Signed In"

}

function flowFactorSessionBegin() {
    document.getElementById('editArea').style.display = "block";
    document.getElementById('resultDiv').style.display = "none";
    document.getElementById('devProjectionsArea').style.display="none";
    
}
document.getElementById("startForecast").addEventListener("click", flowFactorSessionBegin)
document.getElementById("signIn").addEventListener("click", layerSwap)
function zoningLandUseSessionBegin() {
    document.getElementById('editArea').style.display = "none";
    document.getElementById('resultDiv').style.display = "none";
    document.getElementById('devProjectionsArea').style.display="block";
}
document.getElementById("developmentForecast").addEventListener("click", zoningLandUseSessionBegin)

// Clear the geometry and set the default renderer
function clearGeometry() {
    sketchGeometry = null;
    sketchViewModel.cancel();
    sketchLayer.removeAll();
    clearHighlighting();
    document.getElementById('resultDiv').style.display = "none";
    document.getElementById('editArea').style.display = "none";
    document.getElementById('devProjectionsArea').style.display = "none";
}
var highlightHandle = null;

function clearHighlighting() {
    if (highlightHandle) {
    highlightHandle.remove();
    highlightHandle = null;
    };
};

// set the geometry query on the visible view
var debouncedRunQuery = promiseUtils.debounce(function () {
    if (!sketchGeometry) {
    return;
    }
    document.getElementById('resultDiv').style.display = "block";
    return promiseUtils.eachAlways([
    queryStatistics(),
    updateSceneLayer(),
    test()
    ]);
});

function runQuery() {
    debouncedRunQuery().catch((error) => {
    if (error.name === "AbortError") {
        return;
    }
    console.error(error);
    })
}
var highlightHandle = null;

function clearHighlighting() {
    if (highlightHandle) {
    highlightHandle.remove();
    highlightHandle = null;
    }
}

function highlightBuildings(objectIds) {
    // Remove any previous highlighting
    clearHighlighting();
    const objectIdField = sceneLayer.objectIdField;
    document.getElementById("count").innerHTML = objectIds.length;

    highlightHandle = sceneLayerView.highlight(objectIds);
}

function updateSceneLayer() {
    const query = sceneLayerView.createQuery();
    query.geometry = sketchGeometry;
    // console.log(sceneLayerView.queryObjectIds(query).then(function(objectIds){console.log(objectIds)}))
    return sceneLayerView
    .queryObjectIds(query)
    .then(highlightBuildings);
};

function test() {
const query = sceneLayerView.createQuery();
query.geometry = sketchGeometry;
console.log(sceneLayerView)
sceneLayerView.queryObjectIds(query).then(function (result) {
    result.forEach(each => console.log(each))
    })
};

var waterChart = null;
var sewerChart = null;
var waterUsageChart = null;

function queryStatistics() {
    const statDefinitions = [{
        onStatisticField: "CASE WHEN waterUser = 'Yes' THEN 1 ELSE 0 END",
        outStatisticFieldName: "waterUserCount",
        statisticType: "sum"
    },
    {
        onStatisticField: "CASE WHEN waterUser = 'No' THEN 1 ELSE 0 END",
        outStatisticFieldName: "noWaterCount",
        statisticType: "sum"
    },
    {
        onStatisticField: "CASE WHEN sewerUser = 'Yes'  THEN 1 ELSE 0 END",
        outStatisticFieldName: "sewerUserCount",
        statisticType: "sum"
    },
    {
        onStatisticField: "CASE WHEN sewerUser = 'No' THEN 1 ELSE 0 END",
        outStatisticFieldName: "noSewerCount",
        statisticType: "sum"
    },
    {
        onStatisticField: "waterUsage",
        outStatisticFieldName: "totalWaterUsage",
        statisticType: "sum"
    },
    ];
    const query = sceneLayerView.createQuery();
    query.geometry = sketchGeometry;
    query.outStatistics = statDefinitions;

    return sceneLayerView.queryFeatures(query).then(function (result) {
    const allStats = result.features[0].attributes;
    updateChart(waterChart, [
        allStats.waterUserCount,
        allStats.noWaterCount,
    ]);
    updateChart(sewerChart, [
        allStats.sewerUserCount,
        allStats.noSewerCount
    ]);
    updateChart(waterUsageChart, [
        allStats.totalWaterUsage
    ]);
    }, console.error);
}
// Updates the given chart with new data
function updateChart(chart, dataValues) {
    chart.data.datasets[0].data = dataValues;
    chart.update();
}

function createWaterUserChart() {

    const waterCanvas = document.getElementById("water-chart");
    waterChart = new Chart(waterCanvas.getContext("2d"), {
    type: "horizontalBar",
    data: {
        labels: [
        "Water Service",
        "No Water Service",
        ],
        datasets: [{
        value: "Water (# Customers)",
        backgroundColor: "#149dcf",
        stack: "Stack 0",
        data: [0, 0]
        }]
    },
    options: {
        responsive: false,
        legend: {
        display: false
        },
        title: {
        display: true,
        text: "Water (# Customers)"
        },
        scales: {
        xAxes: [{
            stacked: true,
            ticks: {
            beginAtZero: true,
            precision: 0
            }
        }],
        yAxes: [{
            stacked: false
        }]
        }
    }
    });
}

function createWaterUsageChart() {

const waterUsageCanvas = document.getElementById("water-usage-chart");
waterUsageChart = new Chart(waterUsageCanvas.getContext("2d"), {
    type: "horizontalBar",
    data: {
    labels: [
        "Total Water Usage"
    ],
    datasets: [{
        value: "Total Water Usage in Selection",
        backgroundColor: "#149dcf",
        data: [0]
    }]
    },
    options: {
    responsive: false,
    legend: {
        display: false
    },
    title: {
        display: true,
        text: "Total Water Usage in Selection"
    },
    tooltips: {
    callbacks: {
            label: function(tooltipItem, data) {
                var value = data.datasets[0].data[tooltipItem.index];
                if(parseInt(value) >= 1000){
                            return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                        } else {
                            return value;
                        }
            }
    } // end callbacks:
    },
    scales: {
    xAxes: [{
    ticks: {
        beginAtZero: true,
        callback: function(value, index, values) {
        if(parseInt(value) >= 1000){
            return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        } else {
            return value;
        }
        }
    }
    }]
}
}});}

function createSewerChart() {
    const sewerCanvas = document.getElementById("sewer-chart");
    sewerChart = new Chart(sewerCanvas.getContext("2d"), {
    type: "doughnut",
    data: {
        labels: ["Sewer", "No Sewer"],
        datasets: [{
        backgroundColor: [
            "#FD7F6F",
            "#7EB0D5",
        ],
        borderWidth: 0,
        data: [0, 0]
        }]
    },
    options: {
        responsive: false,
        cutoutPercentage: 35,
        legend: {
        position: "bottom"
        },
        title: {
        display: true,
        text: "Sewer (# Customers)"
        }
    }
    });
}

function clearCharts() {
    updateChart(waterChart, [0, 0]);
    updateChart(sewerChart, [0, 0]);
    updateChart(waterUsageChart, [0])
    document.getElementById("count").innerHTML = 0;
}

createWaterUserChart();
createSewerChart();
createWaterUsageChart();

document.getElementById('submitFf').addEventListener('click',getFfInputVals)
document.getElementById('submitLu').addEventListener('click',getLuInputVals)


function getFfInputVals() {
    var inputs = document.getElementsByClassName( 'ffInput' ),
        fields  = [].map.call(inputs, function( input ) {
            return input.id;
        }).join( '|' );
    
    var inputs = document.getElementsByClassName( 'ffinput' ),
        values  = [].map.call(inputs, function( input ) {
            return input.value;
        }).join( '|' );
    console.log(fields, values);
    setTimeout(() => {document.getElementById('editArea').style.display = "none"}, 150);
}

function getLuInputVals() {
    var inputs = document.getElementsByClassName( 'luInput' ),
        fields  = [].map.call(inputs, function( input ) {
            return input.id;
        }).join( '|' );
    
    var inputs = document.getElementsByClassName( 'luinput' ),
        values  = [].map.call(inputs, function( input ) {
            return input.value;
        }).join( '|' );
    console.log(fields, values);
    setTimeout(() => {document.getElementById('editArea').style.display = "none"}, 150);
}
        
});