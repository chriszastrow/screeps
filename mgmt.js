var mgmt = {
////////////////////////////////////////////////////////////////////////////////
/////  SYSTEM & LOGISTICS  /////////////////////////////////////////////////////
initMemory: function(){
    Memory.r0 = {};
},
linkTransfer: function(){
    //LinkOne to LinkZero energy transfer:
    if($sys.link.length > 1){
        if($sys.link[1].energy < 180){
            $sys.link[0].transferEnergy($sys.link[1])}}
},
////////////////////////////////////////////////////////////////////////////////
////////////// BOT MANAGEMENT FUNCTIONS ////////////////////////////////////////
botPerformRole: function(){
    //Define each 'bot' and direct it to its role function:
    for(let key in $.creeps){
        let bot = $.creeps[key];
        $mod.mgmt.goToHome(bot);
        //Role filter to class logic, where action & target are assigned:
        $mod.mgmt[bot.memory.role](bot);
        //Proceed to do primary action on assigned target, or move toward it:
        if(bot[bot.memory.action]($id(bot.memory.target),RESOURCE_ENERGY) == ERR_NOT_IN_RANGE){
            //error reporting.
            console.log('ERROR: '+bot+bot[bot.memory.action]($id(bot.memory.target)));
            bot.moveTo($id(bot.memory.target),{
                //Draw graphic line:
                visualizePathStyle:{
                fill:'transparent',
                stroke:'#00f',
                lineStyle:'dashed',
                strokeWidth:0.1,
                opacity:0.8}})}}
},
goToHome: function(bot){
    //Send bot to home location if it has one:
    if(bot.memory.home != undefined 
        && ($id(bot.memory.home).pos.x != bot.pos.x 
        || $id(bot.memory.home).pos.y != bot.pos.y)){
        bot.moveTo($id(bot.memory.home).pos,{
            //Draw graphic line:
            visualizePathStyle:{
            fill:'transparent',
            stroke:'#0f0',
            lineStyle:'dashed',
            strokeWidth:0.1,
            opacity:0.8}})}
},
activeBotCount: function(){
    //Removes expired bot & updates bot role counters:
    for(let role in $mod.mgmt.botQuota){$var[role] = 0}
    for(let key in Memory.creeps){
        if(!$.creeps[key]){delete Memory.creeps[key]}
        else{let role = Memory.creeps[key].role;$var[role] += 1}}
},
botConstructor: function(){
    //Construct bot (when role quota deficient) following construction recipe:
    if($sys.spawn[0] != null){
        if(!$sys.spawn[0].spawning && $sys.spawn[0].room.energyAvailable > 99){
            for(var role in $mod.mgmt.botQuota){
                if($var[role] < $mod.mgmt.botQuota[role]){
                    $mod.mgmt.botRecipe[role]()}}}}
},
repairManager: function(){
    Memory.r0.repairTarget = [];
    //Iterate damaged structure lists by priority, determine priority target:
    for(let i=0;i<$var.constructionPriorityList.length;i++){
        for(let x=0;x<$var.constructionPriorityList[i].length;x++){
            if($var.constructionPriorityList[i][x] != null){
                //DO NOT REMOVE repairTarget from Memory.r0, it will break towers:
                //TODO: Verify that repairTarget is being properly cleared once handled.
                Memory.r0.repairTarget = $var.constructionPriorityList[i][x];
                return true}}}
},
listFix: function(inputList,hitLimit){
    //Remove nulls & sort as lowest hits first:
    if(typeof hitLimit === 'undefined'){hitLimit = 100000001}
    let tempList = [];
    for(i=0;i<inputList.length;i++){
        if(inputList[i] != null && inputList[i].hits < hitLimit){
            tempList.push(inputList[i])}}
    result = tempList.sort(function(a,b){return a.hits - b.hits});
	return result;
},
findClosestToMe: function(bot,inputList){
    //bot requests to find closest array element to it among input array list:
    if(inputList != undefined){
        for(let i=0;i<inputList.length;i++){
            inputList[i].range = bot.pos.getRangeTo(inputList[i])}
        inputList.sort(function(a,b){return a.range - b.range});
        return inputList}
},
listExtension: function(bot){
    //Make list of all non-full extensions:
    $var.emptyExtension =  $.flags['Flag1'].room.find(FIND_STRUCTURES,{
        filter: (e) => {
        return (e.hits > 0 && e.energy != e.energyCapacity 
        && e.structureType == STRUCTURE_EXTENSION)}});
    //Find closest... Must be kept in Memory.r0 to persist between ticks:
    if(bot){Memory.r0.emptyExtension = $mod.mgmt.findClosestToMe(bot,$var.emptyExtension)}
},
buildSitePriority: function(){
    //Filter construction sites, establish #1 priority:
    let tempList = $.flags['Flag1'].room.find(FIND_MY_CONSTRUCTION_SITES);
    let i = 0;
    prioritize();
    function prioritize(){
        //Sort options via recursive list filter:
        let makeList = tempList.filter(function(s){
            return s.structureType == $var.priorityConstruction[i]});
        if(makeList.length > 0){$var.buildPriority = makeList}
        if(makeList.length == 0 && (i <= $var.priorityConstruction.length)){
            i += 1;prioritize()}}
},
findDroppedEnergy: function(){
    $var.droppedEnergy = $.flags['Flag1'].room.lookForAtArea(
        RESOURCE_ENERGY,0,39,20,49,{
            asArray:true}).filter(function(element,index,array){
            return(element.energy.amount > 50)});
},
upgradeRampart: function(bot){
    let tempList = $.flags['Flag1'].room.find(FIND_STRUCTURES,{filter: (s) =>
        {return (s.structureType == STRUCTURE_RAMPART && s.hits <= $var.rampartPrimaryLimit)}})
    if(tempList.length){return tempList}
},
upgradeBlockade: function(bot,inputList){
	if(inputList.length){if(bot.repair(inputList[0]) == ERR_NOT_IN_RANGE){bot.moveTo(inputList[0])}}
},
////////////////////////////////////////////////////////////////////////////////
/////  SECURITY  ///////////////////////////////////////////////////////////////
towerInit: function(){
    //Tower settings & manual primary target override control point:
    $var.towerPrimaryTarget = $id('58b38ef2405e57715a551f41');//Primary HOSTILE target override.
    $var.towerMaxRange = 6;//Will not fire on HOSTILE target beyond this range.
    $var.towerMinEnergy = 800;//Will not do repair/upgrade actions when energy reserve below threshold.
    $mod.mgmt.towerLogic();
    //TODO: Primary repair/upgrade target override.
    //TODO: towerMaxRange subroutine for dynamic assessment of target engagement strategy.
    //TODO: towerMinEnergy subroutine for variable safe-level to accommodate peace-time vs war-time risk assessment.
},
towerLogic: function(){
    //Check that towers exist & run logic for each:
    if($sys.tower){
        for(let i=0;i<$sys.tower.length;i++){
            let closestHostile = $sys.tower[i].pos.findClosestByRange(FIND_HOSTILE_CREEPS);
            //Override to ensure engagment of existing towerPrimaryTarget:
            if($var.towerPrimaryTarget != null){
                $sys.tower[i].attack($var.towerPrimaryTarget)}
            //Wait until target is in range before engaging:
            else if($sys.tower[i].pos.getRangeTo(closestHostile) < $var.towerMaxRange){
                $sys.tower[i].attack(closestHostile)}
            //If no hostile target in range, continue to conduct infrastructure operations:
            else if($sys.tower[i].energy > $var.towerMinEnergy){
                $mod.mgmt.towerOperations(i)}}}
    //TODO: Activation trigger & cool-down for war-time conditions identification.
    //TODO: Decrease cpu overhead by running intermittently until war-time.
},
towerOperations: function(i){
    //Infrastructure repair & upgrade operations:
    if(Memory.r0.repairTarget.length){
        console.log('else repair target: ');
        $sys.tower[i].repair($id(Memory.r0.repairTarget.id))}
    else if($var.wallPrimary.length){
        //sort wall repair targets by lowest hits:
        let sortedWallList = $mod.mgmt.listFix($var.wallPrimary,$var.wallPrimaryLimit);
        if(sortedWallList[0].hits < $var.wallPrimaryLimit){
            $sys.tower[i].repair(sortedWallList[0])}}
    //TODO: Target list use key:value (I.E. ObjectId:'10000' ...instead of array) to
    //...individualize each targets appropriate hit level.
},
////////////////////////////////////////////////////////////////////////////////
/////  BACKEND ARCHITECTURE STUFF  /////////////////////////////////////////////
checkStructure: function(){
    //Arrays for each structure type to allow discrete targeting of structures:
    //This is also critical for avoiding 'undefined' object errors arising from methods
    //... using structure objects which may not yet exist, or may have ceased to exist.
    //TODO: Create a testing method for functions to call whenever they want to interact
    //...with an object to verify it exists.
    $sys = {
        room : Object.keys($.rooms),
        spawn : $.flags['Flag1'].room.find(FIND_MY_STRUCTURES, {
            filter: (s) => {return (s.structureType == STRUCTURE_SPAWN)}}),
        source : $.flags['Flag1'].room.find(FIND_SOURCES),
        controller : $.flags['Flag1'].room.find(FIND_MY_STRUCTURES, {
            filter: (s) => {return (s.structureType == STRUCTURE_CONTROLLER)}}),
        container : $.flags['Flag1'].room.find(FIND_STRUCTURES, {
            filter: (s) => {return (s.structureType == STRUCTURE_CONTAINER)}}),
        road : $.flags['Flag1'].room.find(FIND_STRUCTURES, {
            filter: (s) => {return (s.structureType == STRUCTURE_ROAD)}}),
        extension : $.flags['Flag1'].room.find(FIND_MY_STRUCTURES, {
            filter: (s) => {return (s.structureType == STRUCTURE_EXTENSION)}}),
        storage : $.flags['Flag1'].room.find(FIND_MY_STRUCTURES, {
            filter: (s) => {return (s.structureType == STRUCTURE_STORAGE)}}),
        lab : $.flags['Flag1'].room.find(FIND_MY_STRUCTURES, {
            filter: (s) => {return (s.structureType == STRUCTURE_LAB)}}),
        tower : $.flags['Flag1'].room.find(FIND_MY_STRUCTURES, {
            filter: (s) => {return (s.structureType == STRUCTURE_TOWER)}}),
        link : $.flags['Flag1'].room.find(FIND_MY_STRUCTURES, {
            filter: (s) => {return (s.structureType == STRUCTURE_LINK)}}),
        terminal : $.flags['Flag1'].room.find(FIND_MY_STRUCTURES, {
            filter: (s) => {return (s.structureType == STRUCTURE_TERMINAL)}}),
        extractor : $.flags['Flag1'].room.find(FIND_MY_STRUCTURES, {
            filter: (s) => {return (s.structureType == STRUCTURE_EXTRACTOR)}}),
        lab : $.flags['Flag1'].room.find(FIND_MY_STRUCTURES, {
            filter: (s) => {return (s.structureType == STRUCTURE_LAB)}}),
        mineral : $.flags['Flag1'].room.find(FIND_MINERALS),
    }
},
initTick: function(){//New tick init, run at start of every tick (globals must be renewed each tick)
global.$ = Game;
global.$id = function(id){return $.getObjectById(id)};//Shorthand.
global.$var = {};//Global for variables (cleared at end of every tick).
global.$sys = {};
//When structures fall below specified hits, they get included in repair priority list:
$var.minHitsRoad = 4200;
$var.minHitsContainer = 88000;
//Walls & ramparts will not be upgraded beyond these threshold limits:
$var.rampartPrimaryLimit = 1444888;
$var.wallPrimaryLimit = 3000888;
$var.wallPrimary = [
    $id('58ac6cf506731f024d8540b4'),
    $id('58ac6d0999072511ff45d479'),
    $id('58af1ba11092d4e713f0840e'),
    $id('58ac6d3e6c8cb9020f23e141'),
    ];
$var.wallSecondaryLimit = 888;
$var.wallSecondary = [
    ];
$var.dismantle = [
    ];
//Priority of construction project types is established by the order of this array:
$var.priorityConstruction = [
    STRUCTURE_WALL,
    STRUCTURE_SPAWN,
    STRUCTURE_TOWER,
    STRUCTURE_LINK,
    STRUCTURE_PORTAL,
    STRUCTURE_RAMPART,
    //STRUCTURE_CONTROLLER,
    STRUCTURE_OBSERVER,
    STRUCTURE_POWER_BANK,
    STRUCTURE_POWER_SPAWN,
    STRUCTURE_EXTRACTOR,
    STRUCTURE_TERMINAL,
    STRUCTURE_NUKER,
    STRUCTURE_LAB,
    STRUCTURE_STORAGE,
    STRUCTURE_EXTENSION,
    STRUCTURE_CONTAINER,
    STRUCTURE_ROAD,
    ];
},
////////////////////////////////////////////////////////////////////////////////
/////  BOT CLASS LOGIC  ////////////////////////////////////////////////////////
botClassUpkeep: function(bot){
    if(bot.carry.energy == 0){
        bot.memory.action = 'withdraw';bot.memory.target = $sys.link[1].id}
    if(bot.carry.energy > 0){
        for(i=0;i<$sys.tower.length;i++){
            if($sys.tower[i].energy < 850){
                bot.memory.action = 'transfer';bot.memory.target = $sys.tower[i].id}
            else{
                //Upgrade any ramparts to system defined minimum HP:
                let tempList = $mod.mgmt.upgradeRampart(bot);
                if(tempList != undefined){
                    bot.memory.action = 'repair';bot.memory.target = tempList[0].id}}}}
},
botClassRunner: function(bot){
    if($.time % 4 == 0){$mod.mgmt.listExtension(bot)}
    if(bot.carry.energy == 0){
        bot.memory.action = 'withdraw';bot.memory.target = $sys.container[0].id}
    if(bot.carry.energy > 0){
        if(Memory.r0.emptyExtension[0]){
            bot.memory.action = 'transfer';bot.memory.target = Memory.r0.emptyExtension[0].id}
        else if($sys.container[0].hits < 244000){
            bot.memory.action = 'repair';bot.memory.target = $sys.container[0].id}
        else if($sys.container[1].hits < 244000){
            bot.memory.action = 'repair';bot.memory.target = $sys.container[1].id}
        else{bot.memory.target = $sys.storage[0].id}}
},
botClassTransporter: function(bot){
    if(bot.carry.energy == 0){
        if($sys.container[1].store.energy > 300){
            bot.memory.action = 'withdraw';bot.memory.target = $sys.container[1].id}
        else if($sys.container[0].store.energy > 500){
            bot.memory.action = 'withdraw';bot.memory.target = $sys.container[0].id}}
    if(bot.carry.energy > 0){
        if($sys.link[0].energy < 700){
            if($sys.link[0].energy < 700){
                bot.memory.action = 'transfer';bot.memory.target = $sys.link[0].id}
            else{
                bot.memory.action = 'transfer';bot.memory.target = $sys.storage[0].id}}}
},
botClassBuilder: function(bot){
    if(bot.carry.energy == 0){
            bot.memory.action = 'withdraw';bot.memory.target = $sys.storage[0].id}
    if(bot.carry.energy > 0){
        if($var.buildPriority){
            bot.memory.action = 'build';bot.memory.target = $var.buildPriority[0].id}}
},
botClassFeeder: function(bot){
    if(bot.carry.energy == 0){
        bot.memory.action = 'withdraw';bot.memory.target = $sys.link[0].id}
    if(bot.carry.energy > 0){
        bot.memory.action = 'transfer';bot.memory.target = $sys.controller[0].id}
},
botClassHarvZero: function(bot){
    bot.memory.action = 'harvest';bot.memory.target = $sys.source[0].id
},
botClassHarvOne: function(bot){
    bot.memory.action = 'harvest';bot.memory.target = $sys.source[1].id
},
////////////////////////////////////////////////////////////////////////////////
/////  BOT CLASS RECIPES & QUOTAS  /////////////////////////////////////////////
//Desired bot quantity by role:
botQuota:{
    botClassBuilder : 1,
    botClassHarvZero : 1,
    botClassHarvOne : 1,
    botClassTransporter : 1,
    botClassRunner : 1,
    botClassUpkeep : 1,
    botClassFeeder : 2,
},
botRecipe:{
botClassBuilder: function(){$sys.spawn[0].createCreep(
    [WORK,CARRY,CARRY,CARRY,CARRY,MOVE],
    undefined,{role:'botClassBuilder',home:undefined})},
botClassTransporter: function(){$sys.spawn[0].createCreep(
    [WORK,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE],
    undefined,{role:'botClassTransporter',home:undefined})},
botClassHarvZero: function(){$sys.spawn[0].createCreep(
//    [WORK,WORK,MOVE],
    [WORK,WORK,WORK,WORK,WORK,WORK,MOVE],
    undefined,{role:'botClassHarvZero',home:undefined})},
botClassHarvOne: function(){$sys.spawn[0].createCreep(
    [WORK,WORK,WORK,WORK,WORK,WORK,MOVE],
    undefined,{role:'botClassHarvOne',home:undefined})},
botClassRunner: function(){$sys.spawn[0].createCreep(
//    [WORK,CARRY,CARRY,MOVE],//TODO: Failsafe reboot procedure after catastrophic energy shortfall.
    [WORK,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE],
    undefined,{role:'botClassRunner',home:undefined})},
botClassUpkeep: function(){$sys.spawn[0].createCreep(
    [WORK,CARRY,CARRY,MOVE],
    undefined,{role:'botClassUpkeep',home:undefined})},
botClassFeeder: function(){$sys.spawn[0].createCreep(
    [WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,CARRY,MOVE],
    undefined,{role:'botClassFeeder',home:undefined})},
},
}
module.exports = mgmt
