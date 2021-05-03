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
    
    ], function (esriConfig, WebMap, MapView, FeatureLayer, SketchViewModel, GraphicsLayer, Expand, Legend,
    promiseUtils, UniqueValueRenderer, ClassBreaksRenderer, BasemapToggle) {
    const landUses = ['A-1: Agricultural', 'RE: Residential Estates', 'R-1: Suburban Sudivision', 'RMF: Multi-Family', 'RPD: Planned Unit Development',
                      'MHP: Manufactured Housing Park', 'RC-1: Combined Subdivision', 'B-1: Business (Limited)', 'B-2: Business (General)', 'M-1: Light Industry', 'M-2: Heavy Industry',
                      'C-1: Conservation', 'DZ: Double Zoned', 'TZ: Town', 'UK: Unknown'];
    const basins = ['a','b','c','d','e','f'];
    const districts = ["All Districts","Staunton River", "Callands-Gretna", "Chatham", "Blairs", "Tunstall", "Dan River", "Westover"];
    const ffByLandUse = {'waterFactor_2025':{'A-1':100,'B-1':100,'B-2':100,'C-1':100,'DZ':100,'M-1':100,'M-2':100,'MHP':100,'R-1':100,'RC-1':100,'RE':100,'RMF':100,'RPD':100,'TZ':100,'UK':100},
                         'waterFactor_2030':{'A-1':100,'B-1':100,'B-2':100,'C-1':100,'DZ':100,'M-1':100,'M-2':100,'MHP':100,'R-1':100,'RC-1':100,'RE':100,'RMF':100,'RPD':100,'TZ':100,'UK':100},
                         'waterFactor_2040':{'A-1':100,'B-1':100,'B-2':100,'C-1':100,'DZ':100,'M-1':100,'M-2':100,'MHP':100,'R-1':100,'RC-1':100,'RE':100,'RMF':100,'RPD':100,'TZ':100,'UK':100},
                         'sewerFactor_2025':{'A-1':100,'B-1':100,'B-2':100,'C-1':100,'DZ':100,'M-1':100,'M-2':100,'MHP':100,'R-1':100,'RC-1':100,'RE':100,'RMF':100,'RPD':100,'TZ':100,'UK':100},
                         'sewerFactor_2030':{'A-1':100,'B-1':100,'B-2':100,'C-1':100,'DZ':100,'M-1':100,'M-2':100,'MHP':100,'R-1':100,'RC-1':100,'RE':100,'RMF':100,'RPD':100,'TZ':100,'UK':100},
                         'sewerFactor_2040':{'A-1':100,'B-1':100,'B-2':100,'C-1':100,'DZ':100,'M-1':100,'M-2':100,'MHP':100,'R-1':100,'RC-1':100,'RE':100,'RMF':100,'RPD':100,'TZ':100,'UK':100}};

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

    $('#overallResultsChartDiv').hide()
    $('#basinResultsChartDiv').hide()

    view.map.add(sketchLayer);
    $('#queryDiv').css('display','block');
    view.ui.add(queryDiv, 'bottom-left');
    view.ui.add(resultDiv, "top-right");
    view.ui.add(overallResultsChartDiv,"top-right")
    view.ui.add(basinResultsChartDiv,"top-right");
    let sceneLayer = null;
    let sceneLayerView = null;
    
    var renderersByField = {
        ZONING: zoningRenderer,
        WATER: waterRenderer,
        SEWER: sewerRenderer,
        UTILITIES: utilitiesRender
    };
    
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

        $('#developmentForecast').addClass('disabled');
        $('#basinResults').addClass('disabled');

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

        radioExpand = new Expand({
        view: view,
        content: paneDiv,
        expandIconClass: 'esri-icon-layers',
        group: 'upper_left_expand'
        });
        view.ui.add([basemapExpand, radioExpand], "top-left")
        $('#editArea').css('display','none');
        $('#devProjectionsArea').css('display','none');

        map.removeAll()
        sceneLayer = new FeatureLayer({
        url: "https://services.arcgis.com/t6fsA0jUdL7JkKG2/arcgis/rest/services/sewerWaterDevelopment/FeatureServer/0",
        outFields: ['waterUsage','sewerLoad','waterUser','sewerUser','sewerAndWater','waterFactor_2025','waterFactor_2030','waterFactor_2040',
                    'sewerFactor_2025','sewerFactor_2030','sewerFactor_2040','zone',
                    'landUse_2025','landUse_2030','landUse_2040',
                    'pDeveloped_2025','pDeveloped_2030','pDeveloped_2040',
                    'waterDemand_2025','waterDemand_2030','waterDemand_2040',
                    'sewerLoad_2025','sewerLoad_2030','sewerLoad_2040','psBasin','area'], popupTemplate: {
            "title": "Title",
            "content":"<b>Zoning 2020: </b>{zone}<br><b>Water Flow Factor 2025: </b>{waterFactor_2025}<br><b>Water Flow Factor 2030: </b>{waterFactor_2030}<br><b>Water Flow Factor 2040: </b>{waterFactor_2040}<br><b>Sewer Flow Factor 2025: </b>{sewerFactor_2025}<br><b>Sewer Flow Factor 2030: </b>{sewerFactor_2030}<br><b>Sewer Flow Factor 2040: </b>{sewerFactor_2040}<br><b>Zoning 2025: </b>{landUse_2025}<br><b>Zoning 2030: </b>{landUse_2030}<br><b>Zoning 2040: </b>{landUse_2040}<br><b>% Developed 2025: </b>{pDeveloped_2025}<br><b>% Developed 2030: </b>{pDeveloped_2030}<br><b>% Developed 2040: </b>{pDeveloped_2040}</br><b>Water Demand 2025: </b>{waterDemand_2025}</br><b>Water Demand 2030: </b>{waterDemand_2030}</br><b>Water Demand 2040: </b>{waterDemand_2040}</br><b>Sewer Load 2025: </b>{sewerLoad_2025}</br><b>Sewer Load 2030: </b>{sewerLoad_2030}</br><b>Sewer Load 2040: </b>{sewerLoad_2040}</br><b>Pump Station Basin: </b>{psBasin}"
        }});
        map.add(sceneLayer);
        sceneLayer.renderer = zoningRenderer
        $('#zoningRadio').prop('checked',true)
        view.whenLayerView(sceneLayer).then((layerView) => {sceneLayerView = layerView;});
        
        $('#startForecast').prop('disabled',false);
        $('#tooltiptextid').prop('hidden',true);
        $('startForecastDiv').removeClass('tooltip');
        // view.ui.remove(legendExpand)
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
    
    });
    
    dropdownContainer = document.getElementById('district');
    for (var i = 0; i< districts.length; i++) {
        var optn = districts[i];
        var el = document.createElement("option");
        el.textContent = optn;
        el.value = optn;
        dropdownContainer.appendChild(el);
    };

    dropdownContainerResult = document.getElementById('districtResult');
    for (var i = 0; i< districts.length; i++) {
        var optn = districts[i];
        var el = document.createElement("option");
        el.textContent = optn;
        el.value = optn;
        dropdownContainerResult.appendChild(el);
    };
    
    landUseContainer = document.getElementById('landUse');
    for (var i = 0; i< landUses.length; i++) {
        var optn = landUses[i];
        var el = document.createElement("option");
        el.textContent = optn;
        el.value = optn;
        landUseContainer.appendChild(el);
    }
    
    zoneDropdownContainer = document.getElementsByClassName('zoneTypeContainer');
    for (var i=0; i <zoneDropdownContainer.length; i++) {
        for (var j=0;j <landUses.length; j++) {
            var optn = landUses[j];
            var el = document.createElement("option");
            el.textContent = optn;
            el.value = optn;
            zoneDropdownContainer[i].appendChild(el);
        };
    };

    basinContainer = document.getElementById('basinResult');
    for (var i = 0; i< landUses.length; i++) {
        var optn = basins[i];
        var el = document.createElement("option");
        el.textContent = optn;
        el.value = optn;
        basinContainer.appendChild(el);
    }

    
    $("#district").bind('change', function(){
        const selectedDistrict = $("#district option:selected").val();
        const selectedZoning = $("#landUse option:selected").val();
        console.log(selectedDistrict, selectedZoning);
        const districtQuery = sceneLayer.createQuery();
        if (selectedDistrict != 'All Districts') {
            districtQuery.where = `Districts = '${selectedDistrict}'`;
            sceneLayerView.effect = {
                filter: districtQuery,
                excludedEffect: "opacity(40%) blur(1.5px) brightness(0.8)",
                includedEffect: "brightness(1.2)"};
        }
        else {
            districtQuery.where = `Zone is not null`;
            sceneLayerView.effect = {
                filter: districtQuery,
                excludedEffect: "opacity(40%) blur(1.5px) brightness(0.8)",
                includedEffect: "brightness(1.2)"
            };
        };
    });

    $("#districtResult").bind('change', function(){
        const selectedDistrict = $("#districtResult option:selected").val();
        const selectedZoning = $("#landUse option:selected").val();
        console.log(selectedDistrict, selectedZoning);
        const districtQuery = sceneLayer.createQuery();
        if (selectedDistrict != 'All Districts') {
            districtQuery.where = `Districts = '${selectedDistrict}'`;
            sceneLayerView.effect = {
                filter: districtQuery,
                excludedEffect: "opacity(40%) blur(1.5px) brightness(0.8)",
                includedEffect: "brightness(1.2)"};
        }
        else {
            districtQuery.where = `Zone is not null`;
            sceneLayerView.effect = {
                filter: districtQuery,
                excludedEffect: "opacity(40%) blur(1.5px) brightness(0.8)",
                includedEffect: "brightness(1.2)"
            };
        };
    });
    
    $('#submitFf').bind('click',function(){
        $(".progressInfoWindow").toggleClass('slideIn');
        $("#queryDiv").find('button, checkbox').prop('disabled',true);
        $(".editArea-container").find('button, input, select').prop('disabled',true);
        const selectedDistrict = $("#district option:selected").val();
        const selectedZoning = $("#landUse option:selected").val().split(':')[0];
        console.log(selectedDistrict, ': ', selectedZoning)
        const districtQuery = sceneLayer.createQuery();
        districtQuery.where = `Districts = '${selectedDistrict}' AND Zone ='${selectedZoning}'`;
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
            
            ffByLandUse["waterFactor_2025"][selectedZoning] = parseInt(flowFactorInput["waterFactor_2025"])
            ffByLandUse["waterFactor_2030"][selectedZoning] = parseInt(flowFactorInput["waterFactor_2030"])
            ffByLandUse["waterFactor_2040"][selectedZoning] = parseInt(flowFactorInput["waterFactor_2040"])
            ffByLandUse["sewerFactor_2025"][selectedZoning] = parseInt(flowFactorInput["sewerFactor_2025"])
            ffByLandUse["sewerFactor_2030"][selectedZoning] = parseInt(flowFactorInput["sewerFactor_2030"])
            ffByLandUse["sewerFactor_2040"][selectedZoning] = parseInt(flowFactorInput["sewerFactor_2040"])

            var chunk = 1000;
            for (i=0,j=results.features.length; i<j; i+=chunk) {
            temparray = results.features.slice(i,i+chunk);
            var updateFeatures = temparray.map(function(feature,i){
                esriConfig.request.timeout = 300000;
                feature.geometry = null;
                feature.attributes["waterFactor_2025"] = flowFactorInput["waterFactor_2025"];
                feature.attributes["waterFactor_2030"] = flowFactorInput["waterFactor_2030"];
                feature.attributes["waterFactor_2040"] = flowFactorInput["waterFactor_2040"];
                feature.attributes["sewerFactor_2025"] = flowFactorInput["sewerFactor_2025"];
                feature.attributes["sewerFactor_2030"] = flowFactorInput["sewerFactor_2030"];
                feature.attributes["sewerFactor_2040"] = flowFactorInput["sewerFactor_2040"];
                feature.attributes["waterDemand_2030"] = Math.round(flowFactorInput["waterFactor_2030"] * feature.attributes["area"] * feature.attributes["pDeveloped_2025"]);
                feature.attributes["waterDemand_2025"] = Math.round(flowFactorInput["waterFactor_2025"] * feature.attributes["area"] * feature.attributes["pDeveloped_2030"]);
                feature.attributes["waterDemand_2040"] = Math.round(flowFactorInput["waterFactor_2040"] * feature.attributes["area"] * feature.attributes["pDeveloped_2040"]);
                feature.attributes["sewerLoad_2025"] =   Math.round(flowFactorInput["sewerFactor_2025"] * feature.attributes["area"] * feature.attributes["pDeveloped_2025"]);
                feature.attributes["sewerLoad_2030"] =   Math.round(flowFactorInput["sewerFactor_2030"] * feature.attributes["area"] * feature.attributes["pDeveloped_2030"]);
                feature.attributes["sewerLoad_2040"] =   Math.round(flowFactorInput["sewerFactor_2040"] * feature.attributes["area"] * feature.attributes["pDeveloped_2040"]);
    
                return feature
            });
                console.log(updateFeatures);
                console.log(ffByLandUse);

                
                sceneLayer.applyEdits({
                    updateFeatures: updateFeatures
                }).then(function(results){
                    console.log("update results",results.updateFeatureResults.length);    
                }).then(function(){
                    if (j-i <= 1000) {
                        $('.progressInfoWindow').toggleClass('slideIn');
                        $('#editArea').css('display','none')
                        $("#queryDiv").find('button, checkbox').prop('disabled',false);
                        $(".editArea-container").find('button, input, select').prop('disabled',false);    
                        sceneLayerView.effect = "none";
                    }
                }).catch(function(err){
                    console.log(err)
                });

            }
           
        })
        });
    
    $('#submitLu').bind('click', function(){sceneLayerView.effect="none"}).bind('click', function(){
        $('.progressInfoWindow').toggleClass('slideIn');
        $("#queryDiv").find('button, checkbox').prop('disabled',true);
        $(".editArea-container").find('button, input, select').prop('disabled',true);
        const query = sceneLayerView.createQuery();
        query.geometry = sketchGeometry;
        sceneLayerView.queryFeatures(query).then(function (results) {
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

        var i,j,temparray,chunk = 1000;
            for (i=0,j=results.features.length; i<j; i+=chunk) {
            temparray = results.features.slice(i,i+chunk);
            var updateFeatures = temparray.map(function(feature,i){
                esriConfig.request.timeout = 300000;
                feature.geometry = null;
                feature.attributes["waterUser"] = landUseInput["conexYear"]
                feature.attributes["sewerUser"] = landUseInput["conexYear"]
                feature.attributes["landUse_2025"] = landUseInput["landUse_2025"];
                feature.attributes["landUse_2030"] = landUseInput["landUse_2030"];
                feature.attributes["landUse_2040"] = landUseInput["landUse_2040"];
                feature.attributes["pDeveloped_2025"] = landUseInput["pDeveloped_2025"];
                feature.attributes["pDeveloped_2030"] = landUseInput["pDeveloped_2030"];
                feature.attributes["pDeveloped_2040"] = landUseInput["pDeveloped_2040"];
                feature.attributes["waterDemand_2030"] = Math.round(feature.attributes["waterFactor_2030"] * feature.attributes["area"] * landUseInput["pDeveloped_2025"]);
                feature.attributes["waterDemand_2025"] = Math.round(feature.attributes["waterFactor_2025"] * feature.attributes["area"] * landUseInput["pDeveloped_2030"]);
                feature.attributes["waterDemand_2040"] = Math.round(feature.attributes["waterFactor_2040"] * feature.attributes["area"] * landUseInput["pDeveloped_2040"]);
                feature.attributes["sewerLoad_2025"] =   Math.round(feature.attributes["sewerFactor_2025"] * feature.attributes["area"] * landUseInput["pDeveloped_2025"]);
                feature.attributes["sewerLoad_2030"] =   Math.round(feature.attributes["sewerFactor_2030"] * feature.attributes["area"] * landUseInput["pDeveloped_2030"]);
                feature.attributes["sewerLoad_2040"] =   Math.round(feature.attributes["sewerFactor_2040"] * feature.attributes["area"] * landUseInput["pDeveloped_2040"]);
                
                return feature
            });
                console.log(updateFeatures);

                sceneLayer.applyEdits({
                    updateFeatures: updateFeatures
                }).then(function(results){
                    console.log("update results",results.updateFeatureResults.length);    
                    
                }).then(function(){
                    if (j-i <= 1000){
                        $('.progressInfoWindow').toggleClass('slideIn');
                        $('#editArea').css('display','none')
                        $("#queryDiv").find('button, checkbox').prop('disabled',false);
                        $(".editArea-container").find('button, input, select').prop('disabled',false);    
                        sceneLayerView.effect = "none";
                        clearGeometry();
                    };
                }).catch(function(err){
                    console.log(err)
                })
            }
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
    };
    
    $("#clearGeometry").bind("click",clearGeometry);
    

    
    function flowFactorSessionBegin() {
        clearGeometry();
        clearCharts();
        $('#editArea').css('display','block');
        $('#resultDiv').css('display','none');
        $('#devProjectionsArea').css('display','none');
        $('#devProjectionsArea').css('display','none');
    };
    
    $('#startForecast').bind('click', flowFactorSessionBegin).bind('click',function(){$('.ffInput').val('')});
    $('#overallResults').bind('click', function(){console.log('overall results')});
    
    function zoningLandUseSessionBegin() {
        $('#editArea').css('display','none');
        $('#resultDiv').css('display','none');
        
        if ( $('#developmentForecast').hasClass('disabled') ){
            $('#devProjectionsArea').css('display','none');
        }
        else {
            $('#devProjectionsArea').css('display','block');
        };
    };

    $('#developmentForecast').bind('click', zoningLandUseSessionBegin).bind('click',function(){$('.luInput').val('')});
    $('#basinResults').bind('click',function(){console.log('metershed results')});

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
        $('#basinResults').addClass('disabled');
        sceneLayerView.effect = "none";
        $('#district').prop('selectedIndex',0);
    };

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
        querySelectionResultStats(),
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
    };
    var highlightHandle = null;
    
    function clearHighlighting() {
        if (highlightHandle) {
        highlightHandle.remove();
        highlightHandle = null;
        }
    };
    
    function highlightBuildings(objectIds) {
        // Remove any previous highlighting
        clearHighlighting();
        $('#count').html(objectIds.length);
        highlightHandle = sceneLayerView.highlight(objectIds);
    };
    
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
        results.features.length > 0 ? $('#developmentForecast, #basinResults').removeClass('disabled') : $('#developmentForecast, #basinResults').addClass('disabled');
        })
    };
    
    var waterChart = null;
    var sewerChart = null;
    var waterUsageChart = null;
    var selectionWaterChart = null;
    var selectionSewerChart = null;
    var overallWaterChart = null;
    var overallSewerChart = null;
    var basinWaterChart = null;
    var basinSewerChart = null;
    
    // Updates the given chart with new data
    function updateChart(chart, dataValues) {
        chart.data.datasets[0].data = dataValues;
        chart.update();
    };

    function queryStatistics() {
        const statDefinitions = [{
            onStatisticField: "CASE WHEN waterUser = '2020' THEN 1 ELSE 0 END",
            outStatisticFieldName: "waterUserCount",
            statisticType: "sum"
        },
        {
            onStatisticField: "CASE WHEN waterUser is null THEN 1 ELSE 0 END",
            outStatisticFieldName: "noWaterCount",
            statisticType: "sum"
        },
        {
            onStatisticField: "CASE WHEN sewerUser = '2020'  THEN 1 ELSE 0 END",
            outStatisticFieldName: "sewerUserCount",
            statisticType: "sum"
        },
        {
            onStatisticField: "CASE WHEN sewerUser is null THEN 1 ELSE 0 END",
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
            Math.round(allStats.totalWaterUsage)
        ]);
        }, console.error);
    };

    function querySelectionResultStats() {
        const statDefinitions = [{
            onStatisticField: "CASE WHEN waterUser = '2020' THEN waterUsage ELSE 0 END",
            outStatisticFieldName: "waterDemand_2020",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN waterUser = '2025' THEN waterDemand_2025 ELSE 0 END",
            outStatisticFieldName: "waterDemand_2025",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN waterUser = '2030' THEN waterDemand_2030 ELSE 0 END",
            outStatisticFieldName: "waterDemand_2030",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN waterUser = '2040' THEN waterDemand_2040 ELSE 0 END",
            outStatisticFieldName: "waterDemand_2040",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN sewerUser = '2020' THEN sewerLoad ELSE 0 END",
            outStatisticFieldName: "sewerLoad_2020",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN sewerUser = '2025' THEN sewerLoad_2025 ELSE 0 END",
            outStatisticFieldName: "sewerLoad_2025",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN sewerUser = '2030' THEN sewerLoad_2030 ELSE 0 END",
            outStatisticFieldName: "sewerLoad_2030",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN sewerUser = '2040' THEN sewerLoad_2040 ELSE 0 END",
            outStatisticFieldName: "sewerLoad_2040",
            statisticType: "sum"
        },
        ];
        const query = sceneLayerView.createQuery();
        query.geometry = sketchGeometry
        query.outStatistics = statDefinitions;

        return sceneLayerView.queryFeatures(query).then(function (results){
            const allStats = results.features[0].attributes;
            updateChart(selectionWaterChart, [Math.round(allStats.waterDemand_2020), Math.round(allStats.waterDemand_2025), Math.round(allStats.waterDemand_2030), Math.round(allStats.waterDemand_2040)]);
            updateChart(selectionSewerChart, [Math.round(allStats.sewerLoad_2020), Math.round(allStats.sewerLoad_2025), Math.round(allStats.sewerLoad_2030), Math.round(allStats.sewerLoad_2040)]);
        }, console.error);
    };

    function queryOverallResultStats() {
        const statDefinitions = [{
            onStatisticField: "CASE WHEN waterUser = '2020' THEN waterUsage ELSE 0 END",
            outStatisticFieldName: "waterDemand_2020",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN waterUser = '2025' THEN waterDemand_2025 ELSE 0 END",
            outStatisticFieldName: "waterDemand_2025",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN waterUser = '2030' THEN waterDemand_2030 ELSE 0 END",
            outStatisticFieldName: "waterDemand_2030",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN waterUser = '2040' THEN waterDemand_2040 ELSE 0 END",
            outStatisticFieldName: "waterDemand_2040",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN sewerUser = '2020' THEN sewerLoad ELSE 0 END",
            outStatisticFieldName: "sewerLoad_2020",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN sewerUser = '2025' THEN sewerLoad_2025 ELSE 0 END",
            outStatisticFieldName: "sewerLoad_2025",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN sewerUser = '2030' THEN sewerLoad_2030 ELSE 0 END",
            outStatisticFieldName: "sewerLoad_2030",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN sewerUser = '2040' THEN sewerLoad_2040 ELSE 0 END",
            outStatisticFieldName: "sewerLoad_2040",
            statisticType: "sum"
        },
        ];
        const selectedDistrict = $("#districtResult option:selected").val();
        const query = sceneLayerView.createQuery();
        if (selectedDistrict == 'All Districts') {
            query.where = `Districts is not null`
        }else {
        query.where = `Districts = '${selectedDistrict}'`;
        };
        query.outStatistics = statDefinitions;

        return sceneLayerView.queryFeatures(query).then(function (results){
            const allStats = results.features[0].attributes;
            updateChart(overallWaterChart, [Math.round(allStats.waterDemand_2020), Math.round(allStats.waterDemand_2025), Math.round(allStats.waterDemand_2030), Math.round(allStats.waterDemand_2040)]);
            updateChart(overallSewerChart, [Math.round(allStats.sewerLoad_2020), Math.round(allStats.sewerLoad_2025), Math.round(allStats.sewerLoad_2030), Math.round(allStats.sewerLoad_2040)]);
        }, console.error);
    };

    function queryBasinResultStats() {
        const statDefinitions = [{
            onStatisticField: "CASE WHEN waterUser = '2020' THEN waterUsage ELSE 0 END",
            outStatisticFieldName: "waterDemand_2020",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN waterUser = '2025' THEN waterDemand_2025 ELSE 0 END",
            outStatisticFieldName: "waterDemand_2025",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN waterUser = '2030' THEN waterDemand_2030 ELSE 0 END",
            outStatisticFieldName: "waterDemand_2030",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN waterUser = '2040' THEN waterDemand_2040 ELSE 0 END",
            outStatisticFieldName: "waterDemand_2040",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN sewerUser = '2020' THEN sewerLoad ELSE 0 END",
            outStatisticFieldName: "sewerLoad_2020",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN sewerUser = '2025' THEN sewerLoad_2025 ELSE 0 END",
            outStatisticFieldName: "sewerLoad_2025",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN sewerUser = '2030' THEN sewerLoad_2030 ELSE 0 END",
            outStatisticFieldName: "sewerLoad_2030",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN sewerUser = '2040' THEN sewerLoad_2040 ELSE 0 END",
            outStatisticFieldName: "sewerLoad_2040",
            statisticType: "sum"
        },
        ];
        const selectedBasin = $("#basinResult option:selected").val();
        const query = sceneLayerView.createQuery();
        if (selectedBasin == 'All Basins') {
            query.where = `psBasin is not null`
        }else {
        query.where = `psBasin = '${selectedBasin}'`;
        };
        query.outStatistics = statDefinitions;

        return sceneLayerView.queryFeatures(query).then(function (results){
            const allStats = results.features[0].attributes;
            updateChart(basinWaterChart, [Math.round(allStats.waterDemand_2020), Math.round(allStats.waterDemand_2025), Math.round(allStats.waterDemand_2030), Math.round(allStats.waterDemand_2040)]);
            updateChart(basinSewerChart, [Math.round(allStats.sewerLoad_2020), Math.round(allStats.sewerLoad_2025), Math.round(allStats.sewerLoad_2030), Math.round(allStats.sewerLoad_2040)]);
        }, console.error);
    };

    function createSelectionWaterChart() {
    
        const selectionWaterCanvas = document.getElementById('selectionWaterChart'); 
        selectionWaterChart = new Chart(selectionWaterCanvas.getContext("2d"), {
            type: "bar",
            data: {
            labels: [
                "2020",
                "2025",
                "2030",
                "2040"
            ],
            datasets: [{
                value: "Total Water Usage",
                backgroundColor: [
                    "#2ed9e8",
                    "#2ed9e8",
                    "#2ed9e8",
                    "#2ed9e8",
                ],
                data: [0,0,0,0]
            }]
            },
            options: {
            responsive: true,
            legend: {
                display: false
            },
            title: {
                display: true,
                text: "Total Water Usage"
            },
            
            scales: {
            yAxes: [{
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
        }});};

    function createSelectionSewerChart() {

        const selectionSewerCanvas = document.getElementById('selectionSewerChart'); 
        selectionSewerChart = new Chart(selectionSewerCanvas.getContext("2d"), {
            type: "bar",
            data: {
            labels: [
                "2020",
                "2025",
                "2030",
                "2040"
            ],
            datasets: [{
                value: "Total Sewer Usage",
                backgroundColor: [
                    "#2ed9e8",
                    "#2ed9e8",
                    "#2ed9e8",
                    "#2ed9e8",
                ],
                data: [0,0,0,0]
            }]
            },
            options: {
            responsive: true,
            legend: {
                display: false
            },
            title: {
                display: true,
                text: "Total Sewer Usage"
            },
            
            scales: {
            yAxes: [{
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
        }});};

    function createBasinWaterChart() {
    
        const basinWaterCanvas = document.getElementById('basinWaterChart'); 
        basinWaterChart = new Chart(basinWaterCanvas.getContext("2d"), {
            type: "bar",
            data: {
            labels: [
                "2020",
                "2025",
                "2030",
                "2040"
            ],
            datasets: [{
                value: "Total Water Usage",
                backgroundColor: [
                    "#2ed9e8",
                    "#2ed9e8",
                    "#2ed9e8",
                    "#2ed9e8",
                ],
                data: [0,0,0,0]
            }]
            },
            options: {
            responsive: true,
            legend: {
                display: false
            },
            title: {
                display: true,
                text: "Total Water Usage"
            },
            
            scales: {
            yAxes: [{
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
        }});};

    function createBasinSewerChart() {

        const basinSewerCanvas = document.getElementById('basinSewerChart'); 
        basinSewerChart = new Chart(basinSewerCanvas.getContext("2d"), {
            type: "bar",
            data: {
            labels: [
                "2020",
                "2025",
                "2030",
                "2040"
            ],
            datasets: [{
                value: "Total Water Usage",
                backgroundColor: [
                    "#35de9a",
                    "#35de9a",
                    "#35de9a",
                    "#35de9a",
                ],
                data: [0,0,0,0]
            }]
            },
            options: {
            responsive: true,
            legend: {
                display: false
            },
            title: {
                display: true,
                text: "Total Sewer Load"
            },
            
            scales: {
            yAxes: [{
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
    }});};

    function createOverallWaterChart() {
    
        const overallWaterCanvas = document.getElementById('overallWaterChart'); 
        overallWaterChart = new Chart(overallWaterCanvas.getContext("2d"), {
            type: "bar",
            data: {
            labels: [
                "2020",
                "2025",
                "2030",
                "2040"
            ],
            datasets: [{
                value: "Total Water Usage",
                backgroundColor: [
                    "#2ed9e8",
                    "#2ed9e8",
                    "#2ed9e8",
                    "#2ed9e8",
                ],
                data: [0,0,0,0]
            }]
            },
            options: {
            responsive: true,
            legend: {
                display: false
            },
            title: {
                display: true,
                text: "Total Water Usage"
            },
            
            scales: {
            yAxes: [{
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
        }});};

    function createOverallSewerChart() {

        const overallSewerCanvas = document.getElementById('overallSewerChart'); 
        overallSewerChart = new Chart(overallSewerCanvas.getContext("2d"), {
            type: "bar",
            data: {
            labels: [
                "2020",
                "2025",
                "2030",
                "2040"
            ],
            datasets: [{
                value: "Total Water Usage",
                backgroundColor: [
                    "#35de9a",
                    "#35de9a",
                    "#35de9a",
                    "#35de9a",
                ],
                data: [0,0,0,0]
            }]
            },
            options: {
            responsive: true,
            legend: {
                display: false
            },
            title: {
                display: true,
                text: "Total Sewer Load"
            },
            
            scales: {
            yAxes: [{
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
        }});};

    createSelectionWaterChart();
    createSelectionSewerChart();
    createBasinWaterChart();
    createBasinSewerChart();
    createOverallSewerChart();
    createOverallWaterChart();
    $('#districtResult').bind('change', function(){queryOverallResultStats()});
    $('#basinResult').bind('change',function(){queryBasinResultStats()});
    // createOverallWaterChart();

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
    };
    
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
    }});};
    
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
    };
    
    function clearCharts() {
        updateChart(waterChart, [0, 0]);
        updateChart(sewerChart, [0, 0]);
        updateChart(waterUsageChart, [0]);
        $('#count').html = 0
    };
    
    createWaterUserChart();
    createSewerChart();
    createWaterUsageChart();
    
    $('#developmentForecast').on('click', function(e) {
        if ( $(this).hasClass('disabled') ){
            e.preventDefault();
            alert('Please make a selection');
        }
    });
    
    $("#overallResults").bind('click', function(){
        $('#overallResultsChartDiv').show();
    });
    $("#basinResults").bind('click',function(){
        $('#basinResultsChartDiv').show();
    });

    $("#togBtn").on('change', function() {
        if ($(this).is(':checked')) {
            $(this).attr('value', 'true');
            $('#developmentForecast').css('display','none');
            $('#startForecast').css('display','none');
            $('#basinResults').css('display','block');
            $('#overallResults').css('display','block');
            $('#editArea').hide();
            $('#devProjectionsArea').hide()
            $('#resultDiv').hide()
        }
        else {
           $(this).attr('value', 'false');
           $('#developmentForecast').css('display','block');
           $('#startForecast').css('display','block');
           $('#basinResults').css('display','none');
           $('#overallResults').css('display','none');
           $('#overallResultsChartDiv').hide()
           $('#basinResultsChartDiv').hide()
        }});
    
    $("#close-icon-overall-results").bind('click', function() {
        $('#overallResultsChartDiv').hide();
        clearGeometry();
    })
    
    $("#close-icon-basin-results").bind('click', function() {
        $('#basinResultsChartDiv').hide();
        clearGeometry();
    })

    $("#close-icon-ffinput").bind('click', function(){
        $('#editArea').hide()
    })

    $("#close-icon-luinput").bind('click', function(){
        $('#devProjectionsArea').hide()
    })

    $("#selectionGraphicType").bind('change', function(){
        const selectedGraphicType = $("#selectionGraphicType option:selected").val();
        if (selectedGraphicType == 'Current Statistics') {
            $('div#resultDiv div#existingStats').css('display','block');
            $('div#resultDiv div#projectedStats').css('display','none');
        }
        if (selectedGraphicType == 'Projection Results') {
            $('div#resultDiv div#existingStats').css('display','none');
            $('div#resultDiv div#projectedStats').css('display','block');
        }

    });

    });
    