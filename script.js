var canvas = 0, context = 0;
var fps = 60;

var gfx_lvlColor_alive = "#7fff3f";
var gfx_lvlColor_dead = "#ff2323";
var gfx_bgColor = "#101010";
var gfx_rangeColor = "#151515";
var gfx_linew = 4;

var levelY = 0; // Level base y

const cannonR = 20; // Cannon base radius
const cannonL = 20; // Cannon length
const cannonSpeed = (Math.PI / 2); // Cannon rotation speed
const cannonShootSpeed = 175; // Bullet (initial) speed

const cannonMinAngle = Math.PI / 16;
const cannonMaxAngle = Math.PI / 2 - cannonMinAngle;

var enemySpeed = 30; // Base enemy speed
const enemySpeedVBase = 0; // Enemy speed variance
var enemySpeedVariance = function ( t ) {
   return enemySpeedVBase + 15 - 15 * Math.exp(-t / 500);
}

var g = 50; // Gravity

const reloadSpeed = 0.5; // Cannon reload speed
const boomRange = 20; // Bullet explosion range

const spawnChanceBase = 0.3 / fps; // Chance of spawning an enemy every frame
const spawnChanceMax = 0.6 / fps;
var spawnChance = function ( t ) {
   return spawnChanceBase + (1 - Math.exp(-t / 500)) * (spawnChanceMax - spawnChanceBase);
}

const gameSpeed = 2;
var pause = 0; // 1 = play, 0 = pause

function gradientCol ( a, b, k ) {
   var ar = parseInt ( a.substr(1,2), 16 );
   var ag = parseInt ( a.substr(3,2), 16 );
   var ab = parseInt ( a.substr(5,2), 16 );

   var br = parseInt ( b.substr(1,2), 16 );
   var bg = parseInt ( b.substr(3,2), 16 );
   var bb = parseInt ( b.substr(5,2), 16 );

   var mida = Math.round(ar * k + br * (1-k));
   var midg = Math.round(ag * k + bg * (1-k));
   var midb = Math.round(ab * k + bb * (1-k));

   function hex (x) {
      var s = x.toString(16);
      return s.length > 1 ? s : ('0' + s);
   }

   return "#" + hex(mida) + hex(midg) + hex(midb);
}

var setup = function () {
   canvas = document.getElementById("canvas");
   context = canvas.getContext("2d");
   context.lineJoin = "round";

   if ( localStorage.controller )
      document.getElementById("code").innerText = localStorage.controller;

   codeMirror = CodeMirror.fromTextArea(document.getElementById("code"));

   levelY = 7 * canvas.height / 8;

   document.getElementById("apply").onclick = function () {
      mainLevel.controller = codeMirror.doc.getValue();
      localStorage.controller = mainLevel.controller;
      if ( !pause ) pause = 1;
   }

   document.getElementById("pause").onclick = function () {
      pause = !pause;
      if ( pause ) this.innerText = "Pause";
      else this.innerText = "Play";
   }

   setInterval ( frame, 1000 / fps );
}

var frame = function () {
   draw();
   update();
}

var screenShakeStartT = -1;
function screenShake() { screenShakeStartT = (new Date()).getTime(); }
function getScreenShake () {
   if ( screenShakeStartT < 0 ) return 0;

   t = (new Date()).getTime() - screenShakeStartT;
   return 10 * Math.exp ( -t / 150 ) * Math.cos ( t / 10 );
}

var draw = function () {
   context.save();
   context.translate ( getScreenShake(), 0 );

   context.fillStyle = gfx_bgColor;
   context.fillRect ( 0, 0, canvas.width, canvas.height );

   mainLevel.draw ( context );

   context.restore();
}

var update = function () {
   mainLevel.update ( pause * gameSpeed / fps );
}

var Level = function () {
   this.cannonAngle = 0;
   this.targetAngle = -Math.PI / 4;
   this.cannonHP = 10;
   this.cannonMaxHP = 10;
   this.reload = 1;

   this.enemies = new Array();
   this.enemiesSpeed = new Array();

   this.controller = 0;

   this.time = 0;
   this.kills = 0;
   this.shots = 0;

   this.draw = function ( context ) {
      var R = cannonShootSpeed * cannonShootSpeed / g;
      var r = cannonShootSpeed * cannonShootSpeed / g * Math.sin ( 2 * cannonMinAngle );

      context.fillStyle = gfx_rangeColor;
      context.beginPath();
      context.arc ( 20 + cannonR + cannonL*1.414, levelY, R, Math.PI/2, Math.PI/4 );
      context.fill();

      context.fillStyle = gfx_bgColor;
      context.beginPath();
      context.arc ( 20 + cannonR + cannonL*1.414, levelY, r, Math.PI/2, Math.PI/4 );
      context.fill();

      context.beginPath();
      context.moveTo ( 0, levelY );

      // Cannon base
      context.lineTo ( 20, levelY );
      context.arc ( 20 + cannonR, levelY, cannonR, Math.PI, 0 );

      // Enemies
      for ( i = 0; i < this.enemies.length; i++ ) {
         if ( i == 0 || this.enemies[i][0] - this.enemies[i-1][0] > 20 )
            context.lineTo ( this.enemies[i][0] - 10, levelY );

         context.lineTo ( this.enemies[i][0], levelY - 20 );

         if ( i < this.enemies.length - 1 && this.enemies[i+1][0] - this.enemies[i][0] < 20 ) {
            var x = 0.5 * ( this.enemies[i][0] + this.enemies[i+1][0] );
            var y = 20 - 2 * ( x - this.enemies[i][0] );
            context.lineTo ( x, levelY - y );
         }
         else
            context.lineTo ( this.enemies[i][0] + 10, levelY );
      }

      context.lineTo ( canvas.width, levelY );

      // Cannon
      context.moveTo ( 20 + cannonR + cannonR * Math.cos ( this.cannonAngle ), levelY + cannonR * Math.sin ( this.cannonAngle ) );
      context.lineTo ( 20 + cannonR + (cannonR + cannonL) * Math.cos ( this.cannonAngle ), levelY + (cannonR + cannonL) * Math.sin ( this.cannonAngle ) );

      context.lineWidth = gfx_linew;

      var col = gradientCol ( gfx_lvlColor_alive, gfx_lvlColor_dead, this.cannonHP / this.cannonMaxHP );
      context.strokeStyle = col;

      context.stroke();

      // Projectiles
      context.fillStyle = col;
      for ( i = 0; i < this.projectiles.length; i++ ) {
         context.beginPath();
         context.arc ( this.projectiles[i][0], this.projectiles[i][1], gfx_linew * 0.75, 0, 2 * Math.PI );
         context.fill();
      }

      // Cannon HP
      context.beginPath();
      context.moveTo ( 24, levelY - cannonR - 10 );
      context.lineTo ( 24 + (2 * cannonR - 8) * this.cannonHP / this.cannonMaxHP, levelY - cannonR - 10 );
      context.stroke();

      // HUD
      context.font = "20px Consolas";
      context.fillText ( " Time: " + Math.floor ( this.time / gameSpeed ), 15, 28 );
      context.fillText ( "   HP: " + this.cannonHP + "/" + this.cannonMaxHP, 15, 48 );
      context.fillText ( "Kills: " + this.kills, 15, 68 );

      var accuracy = Math.round(this.kills / this.shots * 100)
      context.fillText ( "Shots: " + this.shots + " (" + (this.shots != 0 ? accuracy + "%" : "-") + ")", 15, 88 );

      context.strokeRect ( canvas.width - 100, 17, 90, 10 );
      context.fillRect ( canvas.width - 100, 17, 90 * this.reload, 10 );
      context.fillText ( "Ready: ", canvas.width - 175, 28 );

      if ( !pause ) {
         context.fillText ( "PAUSED", canvas.width - 125, 58 );
      }
   }

   this.update = function ( t ) {
      if ( t == 0 ) return;

      this.time += t;

      var d = cannonSpeed * t;
      if ( Math.abs(this.targetAngle - this.cannonAngle) < d )
         this.cannonAngle = this.targetAngle;
      else
         this.cannonAngle += Math.sign ( this.targetAngle - this.cannonAngle ) * d;

      for ( i = 0; i < this.projectiles.length; i++ ) {
         this.projectiles[i][0] += this.projectiles[i][2] * t;
         this.projectiles[i][1] += this.projectiles[i][3] * t + 0.5 * g * t * t;
         this.projectiles[i][3] += g * t;

         if ( this.projectiles[i][1] >= levelY ) {
            for ( j = 0; j < this.enemies.length; j++ ) {
               if ( Math.abs ( this.enemies[j][0] - this.projectiles[i][0] ) <= boomRange ) {
                  this.enemies.splice ( j, 1 ); j--;
                  this.kills ++;
               }
            }

            this.projectiles.splice ( i, 1 );
            i--;
         }
      }

      this.reload += reloadSpeed * t;
      if ( this.reload >= 1 ) this.reload = 1;

      if ( mainLevel.controller ) {
         f = function () { eval ( mainLevel.controller ); };
         f.call ( evalContext );
      }

      if ( Math.random() < spawnChance ( this.time ) ) {
         v = enemySpeedVariance ( this.time );
         this.enemies.push ( [ canvas.width + 10, enemySpeed - v + 2*v *  Math.random() ] );
      }

      for ( i = 0; i < this.enemies.length; i++ ) {
         this.enemies[i][0] -= this.enemies[i][1] * t;

         if ( this.enemies[i][0] - 10 < 20 + 2 * cannonR ) {
            this.enemies.splice ( i, 1 );
            this.cannonHP--;
            screenShake();
            if ( this.cannonHP <= 0 ) {
               this.cannonHP = 0;
            }
            i--;
         }
      }

      this.enemies.sort ( function(a,b) { return a[0] - b[0]; } );
   }

   this.projectiles = new Array();

   this.shoot = function () {
      if ( this.reload >= 1 ) {
         this.projectiles.push ( [ 20 + cannonR + (cannonR + cannonL) * Math.cos ( this.cannonAngle ),
            levelY + (cannonR + cannonL) * Math.sin ( this.cannonAngle ),
            cannonShootSpeed * Math.cos ( this.cannonAngle ),
            cannonShootSpeed * Math.sin ( this.cannonAngle )
         ] );
         this.shots++;
         this.reload = 0;
         return 1;
      }

      else return 0;
   }
}

var mainLevel = new Level();

var evalContext = {
   shoot: function () { return mainLevel.shoot(); },
   setCannonAngle: function ( t ) {
      if ( t >= cannonMinAngle && t <= cannonMaxAngle )
         mainLevel.targetAngle = -t;
      else if ( t < -cannonMinAngle )
         mainLevel.targetAngle = -cannonMinAngle;
      else if ( t > cannonMaxAngle )
         mainLevel.targetAngle = -cannonMaxAngle;
   },
   getCannonAngle: function () { return -mainLevel.cannonAngle; },
   getEnemies: function () {
      result = new Array();
      for ( i = 0; i < mainLevel.enemies.length; i++ )
         result.push ( mainLevel.enemies[i][0] );
      return result;
   },
   ready: function () { return mainLevel.reload >= 1; },
   frameTime: function () { return gameSpeed / fps; }
}
