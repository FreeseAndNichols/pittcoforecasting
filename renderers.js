// DEFINE SYMBOLOGY
const zone_Ag = {
    type: "simple-fill",
    color: [211, 255, 190, 0.4],
    style: "solid",
    outline: {
    width: 0.2,
    color: [55, 55, 55, 0.4]
    }
};
const zone_BusLTD = {
    type: "simple-fill",
    color: [161, 0, 80, 0.4],
    style: "solid",
    outline: {
    width: 0.2,
    color: [55, 55, 55, 0.4]
    }
};
const zone_BusGen = {
    type: "simple-fill",
    color: [79, 50, 0, 0.4],
    style: "solid",
    outline: {
    width: 0.2,
    color: [55, 55, 55, 0.4]
    }
};
const zone_Conservation = {
    type: "simple-fill",
    color: [212, 94, 0, 0.4],
    style: "solid",
    outline: {
    width: 0.2,
    color: [55, 55, 55, 0.4]
    }
};
const zone_Double = {
    type: "simple-fill",
    color: [25, 171, 0, 0.4],
    style: "solid",
    outline: {
    width: 0.2,
    color: [55, 55, 55, 0.4]
    }
};
const zone_IndLight = {
    type: "simple-fill",
    color: [131, 0, 173, 0.4],
    style: "solid",
    outline: {
    width: 0.2,
    color: [55, 55, 55, 0.4]
    }
};
const zone_IndHeavy = {
    type: "simple-fill",
    color: [155, 0, 33, 0.4],
    style: "solid",
    outline: {
    width: 0.2,
    color: [55, 55, 55, 0.4]
    }
};
const zone_ResMfdHousingPark = {
    type: "simple-fill",
    color: [172, 227, 0, 0.4],
    style: "solid",
    outline: {
    width: 0.2,
    color: [55, 55, 55, 0.4]
    }
};
const zone_ResSub = {
    type: "simple-fill",
    color: [0, 21, 115, 0.4],
    style: "solid",
    outline: {
    width: 0.2,
    color: [55, 55, 55, 0.4]
    }
};
const zone_ResCombSubdv = {
    type: "simple-fill",
    color: [0, 33, 20, 0.4],
    style: "solid",
    outline: {
    width: 0.2,
    color: [55, 55, 55, 0.4]
    }
};
const zone_ResEstates = {
    type: "simple-fill",
    color: [46, 48, 0, 0.4],
    style: "solid",
    outline: {
    width: 0.2,
    color: [55, 55, 255, 0.4]
    }
};
const zone_ResMF = {
    type: "simple-fill",
    color: [237, 83, 0, 0.4],
    style: "solid",
    outline: {
    width: 0.2,
    color: [55, 55, 55, 0.4]
    }
};
const zone_RPD = {
    type: "simple-fill",
    color: [234, 0, 137, 0.4],
    style: "solid",
    outline: {
    width: 0.2,
    color: [55, 55, 55, 0.4]
    }
};
const zone_Town = {
    type: "simple-fill",
    color: [194, 150, 0, 0.4],
    style: "solid",
    outline: {
    width: 0.2,
    color: [55, 55, 55, 0.4]
    }
};
const zone_Unknown = {
    type: "simple-fill",
    color: [76, 27, 0, 0.4],
    style: "solid",
    outline: {
    width: 0.2,
    color: [55, 55, 55, 0.4]
    }
};

const activeWater = {
    type: "simple-fill",
    color: [0, 255, 255, 0.4],
    style: "solid",
    outline: {
    width: 0.1,
    color: [55, 55, 55, 0.25]
    }
};

const activeSewer = {
    type: "simple-fill",
    color: [0, 255, 0, 0.4],
    style: "solid",
    outline: {
    width: 0.1,
    color: [55, 55, 55, 0.25]
    }
};

const bothUtilities = {
    type: "simple-fill",
    color: [152, 0, 255, 0.25],
    style: "solid",
    outline: {
    width: 0.2,
    color: [55, 55, 55, 0.4]
    }
};

const noUtilities = {
    type: "simple-fill",
    color: [255, 255, 255, 0.1],
    style: "solid",
    outline: {
    width: 0.2,
    color: [55, 55, 55, 0.4]
    }
};

const utilitiesRender = {
    type: "unique-value",
    field: "sewerAndWater",
    defaultSymbol: {
    type: "simple-fill",
    color: "white",
    outline: {
        width: 0.05,
        color: [50, 50, 50, 0.4]
    }
    },
    uniqueValueInfos: [{
    value: "Yes",
    symbol: bothUtilities
    }, {
    value: "No",
    symbol: noUtilities
    }]
};

// construct utilities renderer
const waterRenderer = {
    type: "unique-value",
    field: "waterUser",
    defaultSymbol: {
    type: "simple-fill",
    color: "white",
    outline: {
        width: 0.05,
        color: [50, 50, 50, 0.05]
    }
    },
    uniqueValueInfos: [{
    value: "Yes",
    symbol: activeWater
    }, {
    value: "No",
    symbol: noUtilities
    }]
};

const sewerRenderer = {
    type: "unique-value",
    field: "sewerUser",
    defaultSymbol: {
    type: "simple-fill",
    color: "white",
    outline: {
        width: 0.05,
        color: [50, 50, 50, 0.05]
    }
    },
    uniqueValueInfos: [{
    value: "Yes",
    symbol: activeSewer
    }, {
    value: "No",
    symbol: noUtilities
    }]
};


//NEED TO ADD UTILITY RENDERER TO SHOW PARCELS WITH BOTH SERVICES
//LIKELY NEED TO MAKE COMBINED COLUMN? OR CAN WE QUERY BOTH?

// construct zoning renderer
const zoningRenderer = {
    type: "unique-value",
    field: "zone",
    defaultSymbol: {
    type: "simple-fill", // autocasts as new SimpleFillSymbol()
    style: "backward-diagonal",
    outline: {
        width: 0.4,
        color: [50, 50, 50, 0.6]
    }
    },
    uniqueValueInfos: [{
    value: "A-1",
    symbol: zone_Ag
    }, {
    value: "B-1",
    symbol: zone_BusLTD
    }, {
    value: "B-2",
    symbol: zone_BusGen
    }, {
    value: "C-1",
    symbol: zone_Conservation
    }, {
    value: "DZ",
    symbol: zone_Double
    }, {
    value: "M-1",
    symbol: zone_IndLight
    }, {
    value: "M-2",
    symbol: zone_IndHeavy
    }, {
    value: "MHP",
    symbol: zone_ResMfdHousingPark
    }, {
    value: "R-1",
    symbol: zone_ResSub
    }, {
    value: "RC-1",
    symbol: zone_ResCombSubdv
    }, {
    value: "RE",
    symbol: zone_ResEstates
    }, {
    value: "RMF",
    symbol: zone_ResMF
    }, {
    value: "RPD",
    symbol: zone_RPD
    }, {
    value: "TZ",
    symbol: zone_Town
    }, {
    value: "UK",
    symbol: zone_Unknown
    }]
};