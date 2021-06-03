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
    "esri/widgets/Search",
    "esri/widgets/Zoom", 
    "esri/tasks/Locator",
    
    ], function (esriConfig, WebMap, MapView, FeatureLayer, SketchViewModel, GraphicsLayer, Expand, Legend,
    promiseUtils, UniqueValueRenderer, ClassBreaksRenderer, BasemapToggle, Search, Zoom, Locator) {
    const landUses = ['A-1: Agricultural', 'RE: Residential Estates', 'R-1: Suburban Sudivision', 'RMF: Multi-Family', 'RPD: Planned Unit Development',
                      'MHP: Manufactured Housing Park', 'RC-1: Combined Subdivision', 'B-1: Business (Limited)', 'B-2: Business (General)', 'M-1: Light Industry', 'M-2: Heavy Industry',
                      'C-1: Conservation', 'DZ: Double Zoned', 'TZ: Town', 'UK: Unknown'];
    const basins = ['All Basins','a','b','c','d','e','f'];
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
        map: map,
        ui: {
            components: ["attribution"]
        }
    });
    
    var search = new Search({
        sources: [{
          locator: new Locator({ url: "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer"}),
          countryCode:"USA",
          singleLineFieldName: "SingleLine",
          name: "Custom Geocoding Service",
          placeholder: "Address Lookup",
          maxResults: 3,
          maxSuggestions: 3,
          suggestionsEnabled: true,
          minSuggestCharacters: 3
      }],
        view: view,
        includeDefaultSources: false
      });


    view.ui.add(search, "top-left");
    var zoom = new Zoom({
        view: view
    });
    view.ui.add(zoom, "top-left")
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
            url: "https://services.arcgis.com/t6fsA0jUdL7JkKG2/arcgis/rest/services/SewerWaterLanduse_Dev/FeatureServer",
            outFields: ['waterUsage','sewerLoad','waterUser','sewerUser','sewerAndWater','waterFactor_2025','waterFactor_2030','waterFactor_2040',
                        'sewerFactor_2025','sewerFactor_2030','sewerFactor_2040','zone',
                        'landUse_2025','landUse_2030','landUse_2040',
                        'pDeveloped_2025','pDeveloped_2030','pDeveloped_2040',
                        'waterDemand_2025','waterDemand_2030','waterDemand_2040',
                        'sewerLoad_2025','sewerLoad_2030','sewerLoad_2040','psBasin','area', 'manuallyUpdatedFlow'], 
            popupTemplate: {
                title: "Attributes",
                content: [{
                    type: "fields",
                    fieldInfos:[{
                        fieldName:"psBasin",
                        label: "Pump Station Basin",
                    },{    
                        fieldName:"waterDemand_2025",
                        label: "2025 Water Usage (gpd)",
                        format: {
                            digitSeparator: true
                        }
                    },{
                        fieldName:"waterDemand_2030",
                        label: "2030 Water Usage (gpd)",
                        format: {
                            digitSeparator: true
                        }
                    },{
                        fieldName:"waterDemand_2040",
                        label: "2040 Water Usage (gpd)",
                        format: {
                            digitSeparator: true
                        }
                    },{
                        fieldName:"sewerLoad_2025",
                        label: "2025 Wastewater Flow (gpd)",
                        format: {
                            digitSeparator: true
                        }
                    },{
                        fieldName:"sewerLoad_2030",
                        label: "2030 Wastewater Flow (gpd)",
                        format: {
                            digitSeparator: true
                        }
                    },{
                        fieldName:"sewerLoad_2040",
                        label: "2040 Wastewater Flow (gpd)",
                        format: {
                            digitSeparator:true
                        }
                    },{
                        fieldName:"waterFactor_2025",
                        label: "2025 Water Flow Factor (gpd/acre)",
                        format: {
                            digitSeparator:true
                        }
                    },{
                        fieldName:"waterFactor_2030",
                        label: "2030 Water Flow Factor (gpd/acre)",
                        format: {
                            digitSeparator:true
                        }
                    },{
                        fieldName:"waterFactor_2040",
                        label: "2040 Water Flow Factor (gpd/acre)",
                        format: {
                            digitSeparator:true
                        }
                    },{
                        fieldName:"sewerFactor_2025",
                        label: "2025 Wastewater Flow Factor (gpd/acre)",
                        format: {
                            digitSeparator:true
                        }
                    },{
                        fieldName:"sewerFactor_2030",
                        label: "2030 Wastewater Flow Factor (gpd/acre)",
                        format: {
                            digitSeparator:true
                        }
                    },{
                        fieldName:"sewerFactor_2040",
                        label: "2040 Wastewater Flow Factor (gpd/acre)",
                        format: {
                            digitSeparator:true
                        }
                    },{
                        fieldName:"landUse_2025",
                        label: "2025 Zoning",
                    },{
                        fieldName:"landUse_2030",
                        label: "2030 Zoning",
                    },{
                        fieldName:"landUse_2040",
                        label: "2040 Zoning",
                    },{
                        fieldName:"pDeveloped_2025",
                        label: "% Developed 2025"
                    },{
                        fieldName:"pDeveloped_2030",
                        label: "% Developed 2030"
                    },{
                        fieldName:"pDeveloped_2040",
                        label: "% Developed 2040"
                    },{
                        fieldName:"manuallyUpdatedFlow",
                        label: "Flows Manually Entered?"
                    }
                ]}],
            }
        });
        
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
            expanded: true,
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
    for (var i = 0; i< basins.length; i++) {
        var optn = basins[i];
        var el = document.createElement("option");
        el.textContent = optn;
        el.value = optn;
        basinContainer.appendChild(el);
    }

    
    $("#district").bind('change', function(){
        const selectedDistrict = $("#district option:selected").val();
        const selectedZoning = $("#landUse option:selected").val();
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

    $("#landUse, #district").bind('change', function(){
        const selectedZone = $("#landUse option:selected").val().split(':')[0];
        const selectedDistrict = $("#district option:selected").val();
        const zoneQuery = sceneLayer.createQuery();

        if (selectedDistrict != "All Districts") {
            zoneQuery.where = `Districts = '${selectedDistrict}' AND Zone ='${selectedZone}'`;
        }
        else {
            zoneQuery.where = `Zone ='${selectedZone}'`
        }

        sceneLayerView.queryFeatures(zoneQuery).then(function(results){
            const fieldVals = {'water2025':[],'water2030':[],'water2040':[],'sewer2025':[],'sewer2030':[],'sewer2040':[]};
            results.features.forEach(function(result){
                fieldVals['water2025'].push(result.attributes['waterFactor_2025']);
                fieldVals['water2030'].push(result.attributes['waterFactor_2030']);
                fieldVals['water2040'].push(result.attributes['waterFactor_2040']);
                fieldVals['sewer2025'].push(result.attributes['sewerFactor_2025']);
                fieldVals['sewer2030'].push(result.attributes['sewerFactor_2030']);
                fieldVals['sewer2040'].push(result.attributes['sewerFactor_2040']);
            });

            df = new dfd.DataFrame(fieldVals);
            $("#waterFactor_2025").val(df['water2025'].mode()[0]);
            $("#waterFactor_2030").val(df['water2030'].mode()[0]);
            $("#waterFactor_2040").val(df['water2040'].mode()[0]);
            $("#sewerFactor_2025").val(df['sewer2025'].mode()[0]);
            $("#sewerFactor_2030").val(df['sewer2030'].mode()[0]);
            $("#sewerFactor_2040").val(df['sewer2040'].mode()[0]);
        }).catch(function(){
            $("#waterFactor_2025").val('');
            $("#waterFactor_2030").val('');
            $("#waterFactor_2040").val('');
            $("#sewerFactor_2025").val('');
            $("#sewerFactor_2030").val('');
            $("#sewerFactor_2040").val('');
        })
    });

    $("#districtResult").bind('change', function(){
        const selectedDistrict = $("#districtResult option:selected").val();
        const selectedZoning = $("#landUse option:selected").val();
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

    function selectedBasinRenderer(){
        const selectedBasin = $("#basinResult option:selected").val();
        const basinQuery = sceneLayer.createQuery();
        if (selectedBasin != 'All Basins') {
            basinQuery.where = `psBasin = '${selectedBasin}'`;
            sceneLayerView.effect = {
                filter: basinQuery,
                excludedEffect: "opacity(40%) blur(1.5px) brightness(0.1)",
                includedEffect: "brightness(1.1)"};
        }
        else {
            basinQuery.where = `Zone is not null`;
            
            sceneLayerView.effect = {
                filter: basinQuery,
                excludedEffect: "opacity(40%) blur(1.5px) brightness(0.8)",
                includedEffect: "brightness(1.2)"
            };
        };
    };
    
    $('#submitFf').bind('click',function(){
            if( $("#district option:selected").val() != "noSelection"  && $("#landUse option:selected").val() != "noSelection"){
            $(".progressInfoWindow").toggleClass('slideIn');
            $("#queryDiv").find('button, checkbox').prop('disabled',true);
            $(".editArea-container").find('button, input, select').prop('disabled',true);
            let runTotal = 0;
            const selectedDistrict = $("#district option:selected").val();
            const selectedZoning = $("#landUse option:selected").val().split(':')[0];
            const manuallyUpdated = "false"
            const districtQuery = sceneLayer.createQuery();
            districtQuery.where = `Districts = '${selectedDistrict}' AND Zone ='${selectedZoning}' AND manuallyUpdatedFlow = '${manuallyUpdated}'`;
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
                
                ffByLandUse["waterFactor_2025"][selectedZoning] = parseInt(flowFactorInput["waterFactor_2025"])
                ffByLandUse["waterFactor_2030"][selectedZoning] = parseInt(flowFactorInput["waterFactor_2030"])
                ffByLandUse["waterFactor_2040"][selectedZoning] = parseInt(flowFactorInput["waterFactor_2040"])
                ffByLandUse["sewerFactor_2025"][selectedZoning] = parseInt(flowFactorInput["sewerFactor_2025"])
                ffByLandUse["sewerFactor_2030"][selectedZoning] = parseInt(flowFactorInput["sewerFactor_2030"])
                ffByLandUse["sewerFactor_2040"][selectedZoning] = parseInt(flowFactorInput["sewerFactor_2040"])

                var count = 0;
                var chunk = 1000;
                const totalIterations = Math.floor(results.features.length/chunk)
                for (i=0,j=results.features.length; i<j; i+=chunk) {
                    temparray = results.features.slice(i,i+chunk);
                    var updateFeatures = temparray.map(function(feature,i){
                        esriConfig.request.timeout = 300000;
                        feature.geometry = null;

                        if (flowFactorInput["waterFactor_2025"] !== null && flowFactorInput["waterFactor_2025"] !== ''){
                            feature.attributes["waterFactor_2025"] = flowFactorInput["waterFactor_2025"]
                            feature.attributes["waterDemand_2025"] = Math.round(flowFactorInput["waterFactor_2025"] * feature.attributes["area"] * feature.attributes["pDeveloped_2025"]);

                        }

                        if (flowFactorInput["waterFactor_2030"] !== null && flowFactorInput["waterFactor_2030"] !== ''){
                            feature.attributes["waterFactor_2030"] = flowFactorInput["waterFactor_2030"];
                            feature.attributes["waterDemand_2030"] = Math.round(flowFactorInput["waterFactor_2030"] * feature.attributes["area"] * feature.attributes["pDeveloped_2030"]);

                        }

                        if (flowFactorInput["waterFactor_2040"] !== null && flowFactorInput["waterFactor_2040"] !== ''){
                            feature.attributes["waterFactor_2040"] = flowFactorInput["waterFactor_2040"];
                            feature.attributes["waterDemand_2040"] = Math.round(flowFactorInput["waterFactor_2040"] * feature.attributes["area"] * feature.attributes["pDeveloped_2040"]);

                        }

                        if (flowFactorInput["sewerFactor_2025"] !== null && flowFactorInput["sewerFactor_2025"] !== ''){
                            feature.attributes["sewerFactor_2025"] = flowFactorInput["sewerFactor_2025"];
                            feature.attributes["sewerLoad_2025"] =   Math.round(flowFactorInput["sewerFactor_2025"] * feature.attributes["area"] * feature.attributes["pDeveloped_2025"]);

                        }

                        if (flowFactorInput["sewerFactor_2030"] !== null && flowFactorInput["sewerFactor_2030"] !== ''){
                            feature.attributes["sewerFactor_2030"] = flowFactorInput["sewerFactor_2030"];
                            feature.attributes["sewerLoad_2030"] =   Math.round(flowFactorInput["sewerFactor_2030"] * feature.attributes["area"] * feature.attributes["pDeveloped_2030"]);

                        }

                        if (flowFactorInput["sewerFactor_2040"] !== null && flowFactorInput["sewerFactor_2040"] !== ''){
                            feature.attributes["sewerFactor_2040"] = flowFactorInput["sewerFactor_2040"];
                            feature.attributes["sewerLoad_2040"] =   Math.round(flowFactorInput["sewerFactor_2040"] * feature.attributes["area"] * feature.attributes["pDeveloped_2040"]);

                        }

                        else{
                            null
                        }
    
                        return feature
                    });
                    console.log(updateFeatures);
                    console.log(i,j);
                    sceneLayer.applyEdits({
                        updateFeatures: updateFeatures
                    }).then(function(results){
                        console.log("update results",results.updateFeatureResults.length);  
                        count += 1
                    }).then(function(){  
                        if (count == totalIterations + 1) {
                            console.log('done!');
                            $('.progressInfoWindow').toggleClass('slideIn');
                            $('#editArea').css('display','none')
                            $("#queryDiv").find('button, checkbox').prop('disabled',false);
                            $(".editArea-container").find('button, input, select').prop('disabled',false);    
                            sceneLayerView.effect = "none";
                        };
                    }).catch(function(err){
                        console.log(err)
                    });
                };
            });
        }
        else {
            if( $("#district option:selected").val() == "noSelection"  && $("#landUse option:selected").val() != "noSelection"){
                alert('No district selected. Please select a district option before proceeding.')
            }
            else if( $("#district option:selected").val() != "noSelection"  && $("#landUse option:selected").val() == "noSelection"){
                alert('No land use selected. Please select a land use before proceeding.')
            }
        }
    });
    
    $('#submitLu').bind('click', function(){sceneLayerView.effect="none"}).bind('click', function(){
        $('.progressInfoWindow').toggleClass('slideIn');
        $("#queryDiv").find('button, checkbox').prop('disabled',true);
        $(".editArea-container").find('button, input, select').prop('disabled',true);
        let runTotal = 0;
        const manuallyUpdated = "false"
        const query = sceneLayerView.createQuery();
        query.geometry = sketchGeometry;
        query.where = `manuallyUpdatedFlow = '${manuallyUpdated}'`;
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
    
            var i,j,temparray,chunk = 1000;
            for (i=0,j=results.features.length; i<j; i+=chunk) {
            temparray = results.features.slice(i,i+chunk);
            var updateFeatures = temparray.map(function(feature,i){
                esriConfig.request.timeout = 300000;
                feature.geometry = null;
                if (landUseInput["conexYear"] !== null && landUseInput["conexYear"] !== ''){
                    feature.attributes["waterUser"] = landUseInput["conexYear"]
                    feature.attributes["sewerUser"] = landUseInput["conexYear"]
                };

                if (landUseInput["landUse_2025"] !== null && landUseInput["landUse_2025"] !== ''){
                    feature.attributes["landUse_2025"] = landUseInput["landUse_2025"];
                    feature.attributes["waterDemand_2025"] = Math.round(feature.attributes["waterFactor_2025"] * feature.attributes["area"] * landUseInput["pDeveloped_2025"]);
                    feature.attributes["sewerLoad_2025"] =   Math.round(feature.attributes["sewerFactor_2025"] * feature.attributes["area"] * landUseInput["pDeveloped_2025"]);
                };

                if (landUseInput["landUse_2030"] !== null && landUseInput["landUse_2030"] !== ''){
                    feature.attributes["landUse_2030"] = landUseInput["landUse_2030"];
                    feature.attributes["waterDemand_2030"] = Math.round(feature.attributes["waterFactor_2030"] * feature.attributes["area"] * landUseInput["pDeveloped_2030"]);
                    feature.attributes["sewerLoad_2030"] =   Math.round(feature.attributes["sewerFactor_2030"] * feature.attributes["area"] * landUseInput["pDeveloped_2030"]);
                };
                
                if (landUseInput["landUse_2040"] !== null && landUseInput["landUse_2040"] !== ''){
                    feature.attributes["landUse_2040"] = landUseInput["landUse_2040"];
                    feature.attributes["waterDemand_2040"] = Math.round(feature.attributes["waterFactor_2040"] * feature.attributes["area"] * landUseInput["pDeveloped_2040"]);
                    feature.attributes["sewerLoad_2040"] =   Math.round(feature.attributes["sewerFactor_2040"] * feature.attributes["area"] * landUseInput["pDeveloped_2040"]);
                };

                if (landUseInput["pDeveloped_2025"] !== null && landUseInput["pDeveloped_2025"] !== ''){
                    feature.attributes["pDeveloped_2025"] = landUseInput["pDeveloped_2025"]
                }
                
                if (landUseInput["pDeveloped_2030"] !== null && landUseInput["pDeveloped_2030"] !== ''){
                    feature.attributes["pDeveloped_2030"] = landUseInput["pDeveloped_2030"]
                }
                
                if (landUseInput["pDeveloped_2040"] !== null && landUseInput["pDeveloped_2040"] !== ''){
                    feature.attributes["pDeveloped_2040"] = landUseInput["pDeveloped_2040"]
                }

                if (landUseInput["manualWaterUsage_2025"] + landUseInput["manualWaterUsage_2030"] + landUseInput["manualWaterUsage_2040"] +
                    landUseInput["manualSewerUsage_2025"] + landUseInput["manualSewerUsage_2030"] + landUseInput["manualSewerUsage_2040"] > 0) {
                        feature.attributes["waterDemand_2025"] = landUseInput["manualWaterUsage_2025"];
                        feature.attributes["waterDemand_2030"] = landUseInput["manualWaterUsage_2030"];
                        feature.attributes["waterDemand_2040"] = landUseInput["manualWaterUsage_2040"];
                        feature.attributes["sewerLoad_2025"] = landUseInput["manualSewerUsage_2025"];
                        feature.attributes["sewerLoad_2030"] = landUseInput["manualSewerUsage_2030"];
                        feature.attributes["sewerLoad_2040"] = landUseInput["manualSewerUsage_2040"];
                        feature.attributes["manuallyUpdatedFlow"] = "true"
                    }

                else {
                    null
                }
                return feature
            });
                console.log(updateFeatures);

                sceneLayer.applyEdits({
                    updateFeatures: updateFeatures
                }).then(function(results){
                    console.log("update results",results.updateFeatureResults.length);    
                    runTotal += results.updateFeatureResults.length;
                    console.log(j, runTotal, j - runTotal)
                    if (j- runTotal < 1){
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
        });  
    });

    $("#resetDefaults").click(function() {
        $('.progressInfoWindow').toggleClass('slideIn');
        const query = sceneLayerView.createQuery();
        query.geometry = sketchGeometry;
        let runTotal = 0;
        sceneLayerView.queryFeatures(query).then(function (results) {
            var i,j,temparray,chunk = 1000;
                for (i=0,j=results.features.length; i<j; i+=chunk) {
                temparray = results.features.slice(i,i+chunk);
                var updateFeatures = temparray.map(function(feature,i){
                    esriConfig.request.timeout = 300000;
                    feature.geometry = null;
                    feature.attributes["waterDemand_2025"] = Math.round(feature.attributes["waterFactor_2025"] * feature.attributes["area"] * feature.attributes["pDeveloped_2025"]);
                    feature.attributes["waterDemand_2030"] = Math.round(feature.attributes["waterFactor_2030"] * feature.attributes["area"] * feature.attributes["pDeveloped_2030"]);
                    feature.attributes["waterDemand_2040"] = Math.round(feature.attributes["waterFactor_2040"] * feature.attributes["area"] * feature.attributes["pDeveloped_2040"]);
                    feature.attributes["sewerLoad_2025"] =   Math.round(feature.attributes["sewerFactor_2025"] * feature.attributes["area"] * feature.attributes["pDeveloped_2025"]);
                    feature.attributes["sewerLoad_2030"] =   Math.round(feature.attributes["sewerFactor_2030"] * feature.attributes["area"] * feature.attributes["pDeveloped_2030"]);
                    feature.attributes["sewerLoad_2040"] =   Math.round(feature.attributes["sewerFactor_2040"] * feature.attributes["area"] * feature.attributes["pDeveloped_2040"]);
                    feature.attributes["manuallyUpdatedFlow"] = "false"
                    return feature
                });
                console.log(updateFeatures);
                
                sceneLayer.applyEdits({
                    updateFeatures: updateFeatures
                }).then(function(results){
                    console.log("update results",results.updateFeatureResults.length);    
                    runTotal += results.updateFeatureResults.length;
                    console.log(j, runTotal, j - runTotal)
                    if (j- runTotal < 1){
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

            };
        });
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
    $("#polygon-geometry-button").bind('click', function(){
        view.popup.close()
    });

    $("#point-geometry-button").bind('click',geometryButtonsClickHandler);
    $("#point-geometry-button").bind('click', function(){
        view.popup.close()
    });

    function geometryButtonsClickHandler(event) {
        const geometryType = event.target.value;
        clearGeometry();
        sketchViewModel.create(geometryType);
    };
    
    $("#clearGeometry").bind("click",clearGeometry);
    $("#clearGeometry").bind("click",function(){
        view.popup.close()
    });

    function flowFactorSessionBegin() {
        clearGeometry();
        clearCharts();
        $('#editArea').css('display','block');
        $('#resultDiv').css('display','none');
        $('#devProjectionsArea').css('display','none');
        $('#devProjectionsArea').css('display','none');
        view.popup.close();
    };
    
    $('#startForecast').bind('click', flowFactorSessionBegin).bind('click',function(){$('.ffInput').val('')});
    
    function zoningLandUseSessionBegin() {
        $('#editArea').css('display','none');
        $('#resultDiv').css('display','none');
        view.popup.close();
        
        if ( $('#developmentForecast').hasClass('disabled') ){
            $('#devProjectionsArea').css('display','none');
        }
        else {
            $('#devProjectionsArea').css('display','block');
        };
    };

    $('#developmentForecast').bind('click', zoningLandUseSessionBegin).bind('click',function(){$('.luInput').val('')});

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
        return sceneLayerView
        .queryObjectIds(query)
        .then(highlightBuildings);
    };
    
    function test() {
    const query = sceneLayerView.createQuery();
    query.geometry = sketchGeometry;
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
            onStatisticField: "CASE WHEN waterUser = '2025' or waterUser = '2020' THEN waterDemand_2025 ELSE 0 END",
            outStatisticFieldName: "waterDemand_2025",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN waterUser = '2030' or waterUser = '2025' or waterUser = '2020' THEN waterDemand_2030 ELSE 0 END",
            outStatisticFieldName: "waterDemand_2030",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN waterUser = '2040' or waterUser = '2030' or waterUser = '2025' or waterUser = '2020' THEN waterDemand_2040 ELSE 0 END",
            outStatisticFieldName: "waterDemand_2040",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN sewerUser = '2020' THEN sewerLoad ELSE 0 END",
            outStatisticFieldName: "sewerLoad_2020",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN sewerUser = '2025' or sewerUser = '2020' THEN sewerLoad_2025 ELSE 0 END",
            outStatisticFieldName: "sewerLoad_2025",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN sewerUser = '2030' or sewerUser = '2025' or sewerUser = '2020' THEN sewerLoad_2030 ELSE 0 END",
            outStatisticFieldName: "sewerLoad_2030",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN sewerUser = '2040' or sewerUser = '2030' or sewerUser = '2025' or sewerUser = '2020' THEN sewerLoad_2040 ELSE 0 END",
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
            onStatisticField: "CASE WHEN waterUser = '2025' or waterUser = '2020' THEN waterDemand_2025 ELSE 0 END",
            outStatisticFieldName: "waterDemand_2025",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN waterUser = '2030' or waterUser = '2025' or waterUser = '2020' THEN waterDemand_2030 ELSE 0 END",
            outStatisticFieldName: "waterDemand_2030",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN waterUser = '2040' or waterUser = '2030' or waterUser = '2025' or waterUser = '2020'THEN waterDemand_2040 ELSE 0 END",
            outStatisticFieldName: "waterDemand_2040",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN sewerUser = '2020' THEN sewerLoad ELSE 0 END",
            outStatisticFieldName: "sewerLoad_2020",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN sewerUser = '2025' or sewerUser = '2020' THEN sewerLoad_2025 ELSE 0 END",
            outStatisticFieldName: "sewerLoad_2025",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN sewerUser = '2030' or sewerUser = '2025' or sewerUser = '2020' THEN sewerLoad_2030 ELSE 0 END",
            outStatisticFieldName: "sewerLoad_2030",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN sewerUser = '2040' or sewerUser = '2030' or sewerUser = '2025' or sewerUser = '2020'THEN sewerLoad_2040 ELSE 0 END",
            outStatisticFieldName: "sewerLoad_2040",
            statisticType: "sum"
        },
        ];
        const selectedDistrict = $("#districtResult option:selected").val();
        const query = sceneLayerView.createQuery();
        if (selectedDistrict == 'All Districts') {
            query.where = `Districts is not null`;
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
            onStatisticField: "CASE WHEN waterUser = '2025' or waterUser = '2020' THEN waterDemand_2025 ELSE 0 END",
            outStatisticFieldName: "waterDemand_2025",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN waterUser = '2030'  or waterUser = '2025' or waterUser ='2020' THEN waterDemand_2030 ELSE 0 END",
            outStatisticFieldName: "waterDemand_2030",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN waterUser = '2040' or waterUser = '2030'  or waterUser = '2025' or waterUser ='2020'THEN waterDemand_2040 ELSE 0 END",
            outStatisticFieldName: "waterDemand_2040",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN sewerUser = '2020' THEN sewerLoad ELSE 0 END",
            outStatisticFieldName: "sewerLoad_2020",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN sewerUser = '2025' or sewerUser = '2020' THEN sewerLoad_2025 ELSE 0 END",
            outStatisticFieldName: "sewerLoad_2025",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN sewerUser = '2030' or sewerUser = '2025' or sewerUser = '2020' THEN sewerLoad_2030 ELSE 0 END",
            outStatisticFieldName: "sewerLoad_2030",
            statisticType: "sum"
        },{
            onStatisticField: "CASE WHEN sewerUser = '2040' or sewerUser = '2030' or sewerUser = '2025' or sewerUser = '2020' THEN sewerLoad_2040 ELSE 0 END",
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
                text: "Total Water Usage (gpd)"
            },
            tooltips: {
                callbacks: {
                      label: function(tooltipItem, data) {
                          var value = data.datasets[0].data[tooltipItem.index];
                          if(parseInt(value) >= 1000){
                                     return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " gpd";
                                  } else {
                                     return value + " gpd";
                                  }
                      }
                }
            },  
            plugins: {
                datalabels: {
                    formatter: function(value, context) {
                        if(parseInt(value) >= 1000){
                            return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                         } else {
                            return value;
                         }
                    },              
                }
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
                value: "Total Wastewater Flow (gpd)",
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
                text: "Total Wastewater Flow (gpd)"
            },
            tooltips: {
                callbacks: {
                      label: function(tooltipItem, data) {
                          var value = data.datasets[0].data[tooltipItem.index];
                          if(parseInt(value) >= 1000){
                                     return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " gpd";
                                  } else {
                                     return value + " gpd";
                                  }
                      }
                }
            },  
            plugins: {
                datalabels: {
                    formatter: function(value, context) {
                        if(parseInt(value) >= 1000){
                            return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                         } else {
                            return value;
                         }
                    },              
                }
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
                text: "Total Water Usage (gpd)"
            },
            tooltips: {
                callbacks: {
                      label: function(tooltipItem, data) {
                          var value = data.datasets[0].data[tooltipItem.index];
                          if(parseInt(value) >= 1000){
                                     return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " gpd";
                                  } else {
                                     return value + " gpd";
                                  }
                      }
                }
            },  
            plugins: {
                datalabels: {
                    formatter: function(value, context) {
                        if(parseInt(value) >= 1000){
                            return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                         } else {
                            return value;
                         }
                    },              
                }
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
                text: "Total Wastewater Flow (gpd)"
            },
            tooltips: {
                callbacks: {
                      label: function(tooltipItem, data) {
                          var value = data.datasets[0].data[tooltipItem.index];
                          if(parseInt(value) >= 1000){
                                     return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " gpd";
                                  } else {
                                     return value + " gpd";
                                  }
                      }
                }
            },  
            plugins: {
                datalabels: {
                    formatter: function(value, context) {
                        if(parseInt(value) >= 1000){
                            return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                         } else {
                            return value;
                         }
                    },              
                }
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
                text: "Total Water Usage (gpd)"
            },
            tooltips: {
                callbacks: {
                      label: function(tooltipItem, data) {
                          var value = data.datasets[0].data[tooltipItem.index];
                          if(parseInt(value) >= 1000){
                                     return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " gpd";
                                  } else {
                                     return value + " gpd";
                                  }
                      }
                }
            },  
            plugins: {
                datalabels: {
                    formatter: function(value, context) {
                        if(parseInt(value) >= 1000){
                            return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                         } else {
                            return value;
                         }
                    },              
                }
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
                value: "Total Wastewater Flow",
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
                text: "Total Wastewater Flow (gpd)"
            },
            tooltips: {
                callbacks: {
                      label: function(tooltipItem, data) {
                          var value = data.datasets[0].data[tooltipItem.index];
                          if(parseInt(value) >= 1000){
                                     return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " gpd";
                                  } else {
                                     return value + " gpd";
                                  }
                      }
                }
            },  
            plugins: {
                datalabels: {
                    formatter: function(value, context) {
                        if(parseInt(value) >= 1000){
                            return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                         } else {
                            return value;
                         }
                    },              
                }
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
    $('#basinResult').bind('change',function(){queryBasinResultStats(); selectedBasinRenderer()});

    function createWaterUserChart() {
    
        const waterCanvas = document.getElementById('water-chart');
        waterChart = new Chart(waterCanvas.getContext("2d"), {
        type: "horizontalBar",
        data: {
            labels: [
            "Service",
            "No Service",
            ],
            datasets: [{
            value: "Water (# Customers)",
            backgroundColor: [
                "#2ed9e8",
                "#abc5c7"
            ],
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
            tooltips: {
                callbacks: {
                      label: function(tooltipItem, data) {
                          var value = data.datasets[0].data[tooltipItem.index];
                          if(parseInt(value) >= 1000){
                                     return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                                  } else {
                                     return value;
                                  }
                      }
                }
            },  
            plugins: {
                datalabels: {
                    formatter: function(value, context) {
                        if(parseInt(value) >= 1000){
                            return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                         } else {
                            return value;
                         }
                    },              
                }
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
                stacked: false,
                ticks: {
                    display: true
                }
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
                labels: ["Total Water Usage (gpd)"],
                datasets: [{
                    value: "Total Water Usage in Selection",
                    backgroundColor: "#2ed9e8",
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
                    text: "Total Water Usage in Selection (gpd)"
                },
                tooltips: {
                    callbacks: {
                        label: function(tooltipItem, data) {
                            var value = data.datasets[0].data[tooltipItem.index];
                            if(parseInt(value) >= 1000){
                                        return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " gpd";
                                    } else {
                                        return value + " gpd";
                                    }
                        }
                    }
                },  
                plugins: {
                    datalabels: {
                        formatter: function(value, context) {
                            if(parseInt(value) >= 1000){
                                return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                            } else {
                                return value;
                            }
                        },              
                    }
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
                    }],
                    yAxes: [{
                        ticks: {
                            display: false
                        }
                    }]
                }
            }
        });
    };
    
    function createSewerChart() {
        const sewerCanvas = document.getElementById('sewer-chart');
        sewerChart = new Chart(sewerCanvas.getContext("2d"), {
        type: "horizontalBar",
        data: {
            labels: ["Service", "No Service"],
            datasets: [{
            backgroundColor: [
                "#35de9a",
                "#abc7b6",
            ],
            borderWidth: 0,
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
            text: "Wastewater (# Customers)"
            },
            tooltips: {
                callbacks: {
                    label: function(tooltipItem, data) {
                        var value = data.datasets[0].data[tooltipItem.index];
                        if(parseInt(value) >= 1000){
                                    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                                } else {
                                    return value;
                                }
                    }
                }
            },  
            plugins: {
                datalabels: {
                    formatter: function(value, context) {
                        if(parseInt(value) >= 1000){
                            return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                        } else {
                            return value;
                        }
                    },              
                }
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
                }],
                yAxes: [{
                    ticks: {
                        display: true
                    }
                }]
            }
        }
        });
    };
    
    function clearCharts() {
        updateChart(waterChart, [0, 0]);
        updateChart(sewerChart, [0, 0]);
        updateChart(waterUsageChart, [0]);
        updateChart(overallWaterChart, [0]);
        updateChart(overallSewerChart, [0]);
        updateChart(basinWaterChart, [0]);
        updateChart(basinSewerChart,[0]);
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
        view.popup.close();
        clearCharts();
        queryOverallResultStats();
        $('#overallResultsChartDiv').show();
        $('#basinResultsChartDiv').hide()
        clearGeometry();
        $('#basinResult').prop('selectedIndex',0);
    });
    $("#basinResults").bind('click',function(){
        view.popup.close();
        clearCharts();
        queryBasinResultStats();
        $('#basinResultsChartDiv').show();
        $('#overallResultsChartDiv').hide();
        clearGeometry();
        $('#districtResult').prop('selectedIndex',0);
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

    $("#close-icon-selection-results").bind('click', function(){
        $('#resultDiv').hide();
        clearGeometry();
        clearHighlighting();
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


    $('#pDeveloped_2025, #pDeveloped_2030, #pDeveloped_2040').on('keydown keyup change', function(e){
        if ($(this).val() > 100 
            && e.keyCode !== 46 // keycode for delete
            && e.keyCode !== 8 // keycode for backspace
           ) {
           e.preventDefault();
           $(this).val(100);
        }
        else if (e.keyCode == 189 || e.keyCode == 109 || e.keyCode == 187) {
            e.preventDefault();
        }
    });         

    $('#pDeveloped_2030').blur(function(){
        if ($('#pDeveloped_2030').val() - $("#pDeveloped_2025").val() < 0 && $(this).val() != ''){
            alert('2030 development percentage is lower than 2025 development percentage. Please correct if this is not desired.');
        }});

    $('#pDeveloped_2040').blur(function(){
        if ($('#pDeveloped_2040').val() - $("#pDeveloped_2030").val() < 0 && $(this).val() != ''){
            alert('2040 development percentage is lower than 2030 development percentage. Please correct if this is not desired.');
        }
    });

    $('#waterFactor_2025, #waterFactor_2030, #waterFactor_2040, #sewerFactor_2025, #sewerFactor_2030, #sewerFactor_2040').on('keydown keyup change', function (e){
        if (e.keyCode == 189 || e.keyCode == 109 || e.keyCode == 187) {
            e.preventDefault();
        }
    })
   
    $(document).ready(function helpWindowManager(){
        $("#helpIcon").click(function(){
            $("#resultDiv, #editArea, #devProjectionsArea, #overallResultsChartDiv, #basinResultsChartDiv").hide();
            clearGeometry();
            if( $("#helpWindow").hasClass( "offScreen" ) ) {
                $("#helpWindow").removeClass( "offScreen" );
                $("#helpWindow").animate({
                    right:0
                }, 700);
            }
            else {
                $("#helpWindow").animate({
                    right: "-31.5%"
                }, 700);
                $("#helpWindow").addClass( "offScreen");
            }
        })
    });

    $("#close-icon-help-window").click(function(){
        $("#helpWindow").animate({
            right: "-31.5%"
        }, 700);
        $("#helpWindow").addClass( "offScreen");
    })
        
    });
