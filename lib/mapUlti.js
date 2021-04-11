const ffi = require('ffi-napi');
const ref = require('ref-napi');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const libPath = path.join(process.cwd(), 'engine/libunitsync.so');

var libunitsync = ffi.Library(libPath, {
    'Init': [
        'int', 
        ['bool', 'int']
    ],
    'UnInit': [
        'void',
        []
    ],
    'GetMapCount': [
        'int',
        []
    ],
    'GetMapName': [
        'string',
        ['int']
    ],
    'GetMapFileName': [
        'string',
        ['int']
    ],
    'GetMinimap': [
        ref.refType('void'),
        ['string', 'int']
    ]
});


function getMapList() {
    isOpen = libunitsync.Init(0, 0);
    if(isOpen) console.log("OPENED VFS in retrieving map list.");
    mapCount = libunitsync.GetMapCount();
    mapList = [];
    for(i=0; i<mapCount; i++) {
        mapName = libunitsync.GetMapName(i);
        mapList.push(mapName);
    }

    libunitsync.UnInit();

    return mapList;
}

function getMinimapBuf(mapName, reduction=0) {

    var width = 1024/Math.pow(2, reduction);
    var height = width;

    isOpen = libunitsync.Init(0, 0);
    if(isOpen) console.log("OPENED at retrieving minimap.");

    minimapBuf = libunitsync.GetMinimap(mapName, reduction).reinterpret(width * height * 2);

    libunitsync.UnInit();

    return minimapBuf;
}

function convert565toImageData(buffer, height, width) {
    curPixelIndex = 0;
    pixels = []
    while(curPixelIndex < height*width*2) {
        rgb = getPixelColor(buffer.subarray(curPixelIndex, curPixelIndex+2));
        pixels.push(rgb);
        curPixelIndex += 2;
    }

    return pixels;
}

function getPixelColor(pixel) {
    pixelBE = pixel[0];
    pixelLE = pixel[1];
    red = pixelBE & 0xF8;
    green = pixelBE & 0x07 + pixelLE & 0xE0;
    blue = pixelLE & 0x1F;

    return [red, green, blue];
}

async function getMinimapImgTag(buffer, width, height) {
    let canvas = createCanvas(width, height);
    let ctx = canvas.getContext('2d');
    let imgData = ctx.createImageData(width, height);
    let pixelsColorInfo = convert565toImageData(buffer, width, height);
    console.log(pixelsColorInfo.length);
    console.log(imgData.data.length);

    let pixelIndex = 0;
    for(let i=0; i<imgData.data.length && pixelIndex<pixelsColorInfo.length; i+=4) {
        pixel = pixelsColorInfo[pixelIndex];
        imgData.data[i] = pixel[0];
        imgData.data[i+1] = pixel[1];
        imgData.data[i+2] = pixel[2];
        imgData.data[i+3] = 255;
        pixelIndex++;
    }
    ctx.putImageData(imgData, 0, 0);
    return '<img src="' + canvas.toDataURL() + '" />'
}