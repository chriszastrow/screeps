global.$mod = {};
global.$mod.mgmt = require('mgmt');
module.exports.loop = function(){

$mod.mgmt.initTick();//Instantiate globals first for each tick.
if(Memory.r0 == undefined){console.log('**init game**');mod.mgmt.initMemory()} //Run-once, Init new game.
if($.flags['Flag1']){//Check for 'Flag1', placement required for structure check & TickInit.

//Run these first each tick:
//RawMemory.setActiveSegments([0]);
$mod.mgmt.checkStructure();
//$mod.mgmt.controlPanel();
$mod.mgmt.linkTransfer();
$mod.mgmt.towerInit();

//Then run infrastructure/ list generators:
$var.repairRoad = $mod.mgmt.listFix($sys.road,$var.minHitsRoad);
$var.repairContainer = $mod.mgmt.listFix($sys.container,$var.minHitsContainer);
$var.wallPrimary = $mod.mgmt.listFix($var.wallPrimary,$var.wallPrimaryLimit);
$var.wallSecondary = $mod.mgmt.listFix($var.wallSecondary,$var.wallSecondaryLimit);
$var.dismantle = $mod.mgmt.listFix($var.dismantle);
$var.constructionPriorityList = [$var.repairContainer,$var.repairRoad];

//Run these also every tick:
$mod.mgmt.buildSitePriority();
$mod.mgmt.activeBotCount();
$mod.mgmt.botPerformRole();

//Run these at specified interval:
if($.time % 3 == 0){$mod.mgmt.repairManager()}
//if($.time % 14 == 0){$mod.mgmt.findDroppedEnergy()}
if($.time % 7 == 0){$mod.mgmt.botConstructor()}

//RoomVisual boilerplates:
//$.rooms[Object.keys($.rooms)[0]].visual.circle(10,40,{radius:4,fill: 'red'});
//RoomVisual for invaders:
//bot.room.visual.circle(bot.pos,{radius:0.25,opacity:0.8,fill:'red'});
//bot.room.visual.circle(bot.pos,{radius:1,opacity:0.8,fill:'transparent',stroke:'red',strokeWidth:0.3});

if($.time % 1 == 0){//Console print end-of-tick report per interval:
    console.log('REPORT Tick # ' + $.time);
    // console.log('CPU Bucket: ' + $.cpu.bucket);
    // console.log('CPU Per-Tick Limit: ' + $.cpu.limit);
    // console.log('CPU Per-Tick + Bucket Limit: ' + $.cpu.tickLimit);
    console.log('CPU used this tick: ' + $.cpu.getUsed());
    //console.log('Memory currently in use: ' + JSON.stringify(Memory).length);
    console.log('________________________________________');
}
}
}
