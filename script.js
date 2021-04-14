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
    
    ], function (esriConfig, WebMap, MapView, FeatureLayer, SketchViewModel, GraphicsLayer, Expand, Legend,
    promiseUtils, UniqueValueRenderer, ClassBreaksRenderer, BasemapToggle, Portal) {
    
    const landUses = ['A-1: Agricultural', 'RE: Residential Estates', 'R-1: Suburban Sudivision', 'RMF: Multi-Family', 'RPD: Planned Unit Development',
                      'MHP: Manufactured Housing Park', 'RC-1: Combined Subdivision', 'B-1: Business (Limited)', 'B-2: Business (General)', 'M-1: Light Industry', 'M-2: Heavy Industry',
                      'C-1: Conservation', 'DZ: Double Zoned', 'TZ: Town', 'UK: Unknown'];
                      
    const districts = ["Staunton River", "Callands-Gretna", "Chatham", "Blairs", "Tunstall", "Dan River", "Westover"];
    
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
    
    view.map.add(sketchLayer);
    $('#queryDiv').css('display','block');
    view.ui.add(queryDiv, 'bottom-left');
    view.ui.add(resultDiv, "top-right");
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
        if (layer.title === "sewer_water_landUse") {
            map.add(layer)
            return layer.title === "sewer_water_landUse"
        }
        });
    
        map.removeAll();
        map.add(sceneLayer);
        sceneLayer.outFields = ["*"];
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
        view.ui.add([basemapExpand, radioExpand, legendExpand], "top-left")
        $('#editArea').css('display','none');
        $('#devProjectionsArea').css('display','none');
    
    });
    
    dropdownContainer = document.getElementById('district');
    for (var i = 0; i< districts.length; i++) {
        var optn = districts[i];
        var el = document.createElement("option");
        el.textContent = optn;
        el.value = optn;
        dropdownContainer.appendChild(el);
    };
    
    zoneDropdownContainer = document.getElementsByClassName('zoneTypeContainer');
    for (var i=0; i <zoneDropdownContainer.length; i++) {
        for (var j=0;j <landUses.length; j++) {
            var optn = landUses[j];
            var el = document.createElement("option");
            el.textContent = optn;
            el.value = optn;
            zoneDropdownContainer[i].appendChild(el);
        };
    }
    
    $("#district").bind('change', function(){
        const selectedDistrict = $("#district option:selected").val();
        console.log(selectedDistrict);
        const districtQuery = sceneLayer.createQuery();
        districtQuery.where = `Districts = '${selectedDistrict}'`;
        sceneLayerView.effect = {
            filter: districtQuery,
            excludedEffect: "opacity(40%) blur(1.5px) brightness(0.8)",
            includedEffect: "brightness(1.2)"};
    });
    
    $('#submitFf').bind('click',function(){
        const selectedDistrict = $("#district option:selected").val();
        const districtQuery = sceneLayer.createQuery();
        districtQuery.where = `Districts = '${selectedDistrict}' AND zone = 'DZ'`;
        districtQuery.outFields = '*';
        sceneLayerView.queryFeatures(districtQuery).then(function(results){            
            var inputs = $('.ffInput'),
                k  = [].map.call(inputs, function( input ) {
                    return input.id
                });
                v = [].map.call(inputs, function(input){
                    return input.value
                });
        
                const flowFactorInput = {}
                k.forEach((fieldname, index) => {
                    flowFactorInput[fieldname] = v[index]
                })
        
            console.log(flowFactorInput);
            var updateFeatures = results.features.map(function(feature,i){
                feature.attributes["waterFactor_2025"] = flowFactorInput["waterFactor_2025"];
                feature.attributes["waterFactor_2030"] = flowFactorInput["waterFactor_2030"];
                feature.attributes["waterFactor_2040"] = flowFactorInput["waterFactor_2040"];
                feature.attributes["sewerFactor_2025"] = flowFactorInput["sewerFactor_2025"];
                feature.attributes["sewerFactor_2030"] = flowFactorInput["sewerFactor_2030"];
                feature.attributes["sewerFactor_2040"] = flowFactorInput["sewerFactor_2040"];
    
                return feature
            });
                console.log(updateFeatures);
            
                sceneLayer.applyEdits({
                    updateFeatures: updateFeatures
                }).then(function(results){
                    console.log("update results",results)
                }).catch(function(err){
                    console.log(err)
                });
    
    
    
            setTimeout(() => {$('#editArea').css('display','none')}, 150);            
        })
        });
    
    const radios = $('[name = "renderer"]');
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
    $("#polygon-geometry-button").bind('click',geometryButtonsClickHandler);
    $("#point-geometry-button").bind('click',geometryButtonsClickHandler);
    
    function geometryButtonsClickHandler(event) {
        const geometryType = event.target.value;
        clearGeometry();
        sketchViewModel.create(geometryType);
    }
    
    $("#clearGeometry").bind("click",clearGeometry);
    
    function layerSwap() {
        map.removeAll()
        sceneLayer = new FeatureLayer({
        url: "https://services.arcgis.com/t6fsA0jUdL7JkKG2/arcgis/rest/services/sewer_water_landUse_development/FeatureServer/0",
        outFields: '*'});
        map.add(sceneLayer);
        sceneLayer.renderer = zoningRenderer
        $('#zoningRadio').prop('checked',true)
        view.whenLayerView(sceneLayer).then((layerView) => sceneLayerView = layerView);
        $('#startForecast').prop('disabled',false);
        $('#tooltiptextid').prop('hidden',true);
        $('#signIn').prop('disabled',true).html('Signed In').css('cursor','default');
        $('startForecastDiv').removeClass('tooltip');
        view.ui.remove(legendExpand)
        const legend = new Legend({
            view: view,
            layerInfos: [{
                layer: sceneLayer,
                title: 'Pittsylvania County Utilities Dashboard Legend'
            }]
            });
        legendExpand = new Expand({
            view: view,
            content: legend,
            group: "upper_left_expand"
            }); 
        view.ui.add(legendExpand, 'top-left')
    
    }
    
    function flowFactorSessionBegin() {
        clearGeometry();
        clearCharts();
        $('#editArea').css('display','block');
        $('#resultDiv').css('display','none');
        $('#devProjectionsArea').css('display','none');
        $('#devProjectionsArea').css('display','none');
    }
    
    $('#startForecast').bind('click', flowFactorSessionBegin);
    $('#signIn').bind('click', layerSwap).bind('click',clearGeometry);
    
    function zoningLandUseSessionBegin() {
        $('#editArea').css('display','none');
        $('#resultDiv').css('display','none');
        
        if ( $('#developmentForecast').hasClass('disabled') ){
            $('#devProjectionsArea').css('display','none');
        }
        else {
            $('#devProjectionsArea').css('display','block');
        };
    }
    $('#developmentForecast').bind('click', zoningLandUseSessionBegin).bind('click',function(){$('.ffInput').val('');})
    ;
    
    // Clear the geometry and set the default renderer
    function clearGeometry() {
        sketchGeometry = null;
        sketchViewModel.cancel();
        sketchLayer.removeAll();
        clearHighlighting();
        clearCharts();
    
        $('#resultDiv').css('display','none');
        $('#editArea').css('display','none');
        $('#devProjectionsArea').css('display','none');
        $('#developmentForecast').addClass('disabled');
        sceneLayerView.effect = "none";
        $('#district').prop('selectedIndex',0);
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
        $('#resultDiv').css('display','block');
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
        $('#count').html(objectIds.length);
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
    sceneLayerView.queryFeatures(query).then(function (results) {
        console.log(results)
        results.features.length > 0 ? $('#developmentForecast').removeClass('disabled') : $('#developmentForecast').addClass('disabled');
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
    
        const waterCanvas = document.getElementById('water-chart');
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
    
    const waterUsageCanvas = document.getElementById('water-usage-chart'); 
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
        const sewerCanvas = document.getElementById('sewer-chart');
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
        $('#count').html = 0
    }
    
    createWaterUserChart();
    createSewerChart();
    createWaterUsageChart();
    
    $('#submitLu').bind('click', getLuInputVals).bind('click', function(){sceneLayerView.effect="none"})
    
    function getLuInputVals() {
        var inputs = $('.luInput'),
            k  = [].map.call(inputs, function( input ) {
                return input.id
            });
            v = [].map.call(inputs, function(input){
                return input.value.split(':')[0]
            });
    
            const landUseInput = {}
            k.forEach((fieldname, index) => {
                landUseInput[fieldname] = v[index]
            })
    
        console.log(landUseInput);
        setTimeout(() => {$('#devProjectionsArea').css('display', 'none')}, 150);
        $('.luInput').val('');
    }
    
    $('#developmentForecast').on('click', function(e) {
        if ( $(this).hasClass('disabled') ){
            e.preventDefault();
            alert('Please make a selection');
        }
    });
    
    
    });
    