/**
 * Created by jiazhaoyuan on 2018/3/14.
 */

var fs=require('fs');
var path=require('path');
var gui = require('nw.gui');
var hotkeys = require('hotkeys-js');

var imageMap={};
//图片缓存
var bufferArray=[];
var bufferSize=20;
//图片个数
var imageCount=0;
var clipboard;

var g2map;
var elementLayer;
var defaultSymbol;

// 地图元素缓存
var elementCache=[];

var option = {
    key: "Ctrl+Z",
    active: removeLastDraw,
    failed: function (msg) {
        //创建快捷键失败
        alert(msg);
    }
};

window.onload=function(){
    clipboard = gui.Clipboard.get();

    initMap();

	var imageList=document.getElementById('imageList');
	imageList.addEventListener('change',function(){
		var path=imageMap[imageList.value];

        loadImg(path)
	});

    // 创建快捷键
    var shortcut = new gui.Shortcut(option);

    // 注册全局快捷键
    gui.App.registerGlobalHotKey(shortcut);

}

/**
 * 移除最后一个
 */
function removeLastDraw()
{
    if(elementCache.length>0)
    {
        var p = elementCache.pop();
        elementLayer.remove(p)
    }
}

/**
 * 初始化地图
 */
function initMap()
{
    // 创建地图
    g2map = new g2.maps.Map({
        defaultExtent: {
            center: [0, 0],
            maxZoom: 20,
            minZoom: 1,
            level:7
        } // 为方便展示设置视野中心点的范围
    });

    // 初始化地图，传入要初始化的DOM对象的id
    g2map.init({targetId: 'g2map'});
    g2map.on("click",onMapClick);
    g2map.setCursor('crosshair');

    elementLayer = new g2.lys.ElementLayer( {zIndex: 10});
    g2map.addLayer(elementLayer);

    defaultSymbol = new g2.syms.SimpleMarkersymbol({
        fillColor: new g2.syms.Color({
            a: 255,
            r: 255,
            g: 255,
            b: 255
        }),
        borderColor: new g2.syms.Color({
            a: 255,
            r: 255,
            g: 0,
            b: 0
        }),
        size: 5
    });
}

var imageLayer=null;
function loadImg(imgSrc) {
    elementLayer.clear();
    elementCache=[];
    //var imgSrc= document.getElementById('imgUrl').value;

    var img= new Image();
    img.src=imgSrc;
    img.onload=function () {

        var w=img.width*1000;
        var h=img.height*1000;

        if(imageLayer)
        {
            g2map.removeLayer(imageLayer);
        }
        //创建一个图像图层
        imageLayer = new g2.lys.ImageLayer({
            imageType: 702,
            extent:[
                0,
                0,
                w,
                h
            ],//图片范围，请按照坐标系的范围给出，此为3857的坐标系范围
            crossOrigin:"anonymous",//跨域
            url:imgSrc,   // 图层服务 url
            zIndex: 0
        });

        // 将 图像图层添加到地图
        g2map.addLayer(imageLayer);
        var point = new g2.geom.Point({x:w/2,y:h/2,spatialReference: g2.geom.SpatialReference.EPSG3857});
        // g2map.setCenter(point)
        g2map.pan(new g2.geom.Envelope({minx:0,miny:0,maxx:w,maxy:h}));

    }
}

function onMapClick(button, shift, screenX, screenY, mapX, mapY, handle){
    // g2map.setCursor("pointer")
    console.log(mapX+','+mapY)

    var x=mapX.toFixed(2)
    var y=mapY.toFixed(2)
    document.getElementsByClassName("two")[0].style.display = "block";
    document.getElementById("output").innerHTML='<span>坐标（已复制到剪切板）：</span><span>'+x+','+y+'</span>'

    // elementLayer.clear();
    var point1=new g2.geom.Point({x:x,y:y, spatialReference: g2.geom.SpatialReference.EPSG3857});
    var p = new g2.ele.Element({id:0,geometry: point1, symbol: defaultSymbol});

    elementLayer.add(p)
    elementCache.push(p);

    clipboard.clear();
    clipboard.set(x+','+y, 'text');
}



function onDirLoad() {
    var srcInput=document.getElementById("imagePath"),
        srcPath=srcInput.value;
    //srcPath='./floor';

    if(!srcPath){
        alert('请选择'+srcInput.getAttribute('title')+'!');
        return;
    }
    srcPath=srcPath.replace(/\\/g,'/');

    imageSearch(srcPath);
    buildSelect(imageMap,imageList);
}

function buildSelect(imageMap,imageList){
	//clear
	imageList.innerHTML='';
	imageList.value='';
	//add
	for(var k in imageMap){
		var opt=document.createElement('option');
		opt.value=k;
		opt.innerHTML=k;
		imageList.appendChild(opt);
	}

    if(imageList.length>0)
    {
        var imageList = document.getElementById("imageList");
        var path=imageMap[imageList.options[0].value];
        loadImg(path)
    }
}

function imageSearch(srcPath){
	for(var k in imageMap){
		imageMap[k]=null;
		delete imageMap[k];
	}
    //
	try{
		visitDir(srcPath,imageMap);
	}catch(e){
		consoleLine(e.message);
	}
	if(bufferArray.length>0){
        add2Map(imageMap);
    }
    //
    reset();

}
//遍历目录
function visitDir(dirPath,imageMap){
    var files=fs.readdirSync(dirPath,{
        encoding :'utf-8'
    });
    files.forEach(function(filename){
        var realPath=path.join(dirPath,filename);
        var stat=fs.statSync(realPath);
        if(stat.isFile()){
            if(convertable(realPath)){
                var obj={};
                //var imageBuffer=fs.readFileSync(realPath);
                //var base64Str=imageBuffer.toString('base64');
                obj.path=realPath;
                obj.key=filename;//extractKey(filename);
                //obj.base64=base64Str;
                bufferArray.push(obj);
                imageCount++;
                if(bufferArray.length>bufferSize){
					add2Map(imageMap);
                }
            }
        }else{
            visitDir(realPath,imageMap);
        }
    });
}
function add2Map(imageMap){
	for(var i=0,len=bufferArray.length;i<len;i++){
						var imgObj=bufferArray[i];
						if(imgObj){
							imageMap[imgObj.key]=imgObj.path;
						}
					}
					bufferArray=[];
}
function reset(){
    bufferArray=[];
    imageCount=0;
}
//判断文件是否能转换
function convertable(path){
    var regex=/^.*\.(gif|GIF|bmp|BMP|png|PNG|jpg|JPG|jepg|JEPG)$/;
    return regex.test(path);
}
//提取文件名
function extractKey(path){
    var regex=/^(.*\/)?(.*)\.[\w]*$/;
    return regex.exec(path)[2];
}

