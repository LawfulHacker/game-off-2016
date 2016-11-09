var canvas = 0, context = 0;
const fps = 60;

var gfx_lvlColor_alive = "#7fff3f";
var gfx_lvlColor_dead = "#ff2323";
var gfx_bgColor = "#101010";
var gfx_rangeColor = "#151515";
var gfx_linew = 4;

var gfx_enemyH = 17;
var gfx_enemyR = 10;

var levelY = 0; // Level base y

const cannonR = 20; // Cannon base radius
const cannonL = 20; // Cannon length
const cannonX = 20; // Cannon X coordinate
const cannonSpeed = (Math.PI / 2); // Cannon rotation speed
const cannonShootSpeed = 350; // Bullet (initial) speed

const cannonMinAngle = Math.PI / 16;
const cannonMaxAngle = Math.PI / 2 - cannonMinAngle;

const cannonMaxHP = 10;

const enemySpeed = 60; // Base enemy speed
const enemySpeedVBase = 0; // Enemy speed variance
var enemySpeedVariance = function ( t ) {
   return enemySpeedVBase + 15 - 15 * Math.exp(-t / 500);
}

const g = 200; // Gravity

const reloadSpeed = 1; // Cannon reload speed
const boomRange = 20; // Bullet explosion range

const spawnChanceBase = 0.4; // Chance of spawning an enemy every frame
const spawnChanceMax = 1;

const controllerT = 1 / 10 / fps;

var spawnChance = function ( t ) {
   return spawnChanceBase + (1 - Math.exp(-t / 500)) * (spawnChanceMax - spawnChanceBase);
}

var gameSpeed = 1;
var pause = 0; // 1 = play, 0 = pause
var _gameOver = 0;

var spawners = [
   {
      id: "exp_amount",
      name: "Exp_Am",
      desc: "the enemy spawn frequency increases exponentially over time",
      spawnTimeMin: 0,
      spawnTimeMax: 3,
      spawnTimeT: 50,
      speed: 60,
      condition: function ( l ) {
        return l.lastSpawn < 0 || l.time - l.lastSpawn > this.spawnTimeMin + (this.spawnTimeMax - this.spawnTimeMin) * Math.exp ( -l.time / this.spawnTimeT );
      },
      spawn: function ( l ) {
        return [ canvas.width + gfx_enemyR, 60 ];
      }
   },

   {
      id: "exp_all",
      name: "Exp_All",
      desc: "the enemy amount and speed increase exponentially over time",
      spawnTimeMin: 0,
      spawnTimeMax: 3,
      spawnTimeT: 50,
      speedMin: 60,
      speedMax: 120,
      speedT: 50,
      condition: function ( l ) {
        return l.lastSpawn < 0 || l.time - l.lastSpawn > this.spawnTimeMin + (this.spawnTimeMax - this.spawnTimeMin) * Math.exp ( -l.time / this.spawnTimeT );
      },
      spawn: function ( l ) {
         return [ canvas.width + gfx_enemyR, this.speedMax - (this.speedMax - this.speedMin) * Math.exp ( -l.time / this.speedT ) ];
      }
   },

   {
      id: "ran_speed",
      name: "Ran_Spd",
      desc: "the enemy speed is random",
      spawnTime: 3,
      speedAve: 60,
      speedVT: 50,
      speedV: function ( t ) { return 30 * ( 1 - Math.exp ( -t / this.speedVT ) ); },
      condition: function ( l ) {
        return l.lastSpawn < 0 || l.time - l.lastSpawn > this.spawnTime;
      },
      spawn: function ( l ) {
         return [ canvas.width + gfx_enemyR,
            this.speedAve + 2 * this.speedV(l.time) * (Math.random() - 1/2) ];
      }
   },

   {
      id: "ran_amount",
      name: "Ran_Am",
      desc: "the enemy amount is random",
      spawnTimeAve: 3,
      spawnTimeVT: 50,
      spawnTimeV: function ( t ) { return 2 * ( 1 - Math.exp ( -t / this.spawnTimeVT ) ); },
      condition: function ( l ) {
        return l.lastSpawn < 0 || l.time - l.lastSpawn > this.nextT;
      },
      spawn: function ( l ) {
         this.nextT = this.spawnTimeAve + 2 * this.spawnTimeV(l.time) * (Math.random() - 1/2);
         return [ canvas.width + gfx_enemyR, 60 ];
      }
   },

   {
      id: "ran_all",
      name: "Ran_All",
      desc: "the enemy amount and speed is random",
      spawnTimeAve: 3,
      spawnTimeVT: 50,
      spawnTimeV: function ( t ) { return 2 * ( 1 - Math.exp ( -t / this.spawnTimeVT ) ); },
      speedAve: 60,
      speedVT: 50,
      speedV: function ( t ) { return 30 * ( 1 - Math.exp ( -t / this.speedVT ) ); },
      condition: function ( l ) {
        return l.lastSpawn < 0 || l.time - l.lastSpawn > this.nextT;
      },
      spawn: function ( l ) {
         this.nextT = this.spawnTimeAve + 2 * this.spawnTimeV(l.time) * (Math.random() - 1/2);
         return [ canvas.width + gfx_enemyR, this.speedAve + 2 * this.speedV(l.time) * (Math.random() - 1/2) ];
      }
   }
];

function togglePause () {
   pause = 1 - pause;
   pauseBtn = document.getElementById("pause");

   if ( pause ) pauseBtn.innerText = "Pause";
   else pauseBtn.innerText = "Play";
}

function unpauseGame () {
   pause = 1;
   pauseBtn = document.getElementById("pause");
   pauseBtn.innerText = "Pause";
}

function pauseGame () {
   pause = 0;
   pauseBtn = document.getElementById("pause");
   pauseBtn.innerText = "Play";
}

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

   if ( localStorage.controller != undefined )
      document.getElementById("code").innerText = localStorage.controller;

   codeMirror = CodeMirror.fromTextArea(document.getElementById("code"), { lineNumbers: true } );

   levelY = 7 * canvas.height / 8;

   document.getElementById("apply").onclick = function () {
      mainLevel.reset();
      mainLevel.controller = codeMirror.doc.getValue();
      localStorage.controller = mainLevel.controller;
      unpauseGame();
   }

   document.getElementById("pause").onclick = togglePause;

   document.getElementById("slow").onclick = function () {
      gameSpeed -= 1; if ( gameSpeed < 1 ) gameSpeed = 1;
      document.getElementById("speed").innerText = "speed: " + gameSpeed;
   }
   document.getElementById("fast").onclick = function () {
      gameSpeed += 1;
      document.getElementById("speed").innerText = "speed: " + gameSpeed;
   }

   for ( i = 0; i < spawners.length; i++ ) {
      $('<span id="' + i + '" class="btn" name="tooltip">' + i + '</span>').appendTo("#spawners");
   }

   $("#spawners #0").addClass("active");

   $("#spawners .btn").click ( function() {
      $("#spawners .btn.active").removeClass("active");
      $(this).addClass("active");
      mainLevel.spawner = spawners[ this.id ];
      pauseGame();
      mainLevel.reset();
   } );

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

var gameOver = function () {
   pauseGame();
   _gameOver = 1;

   s = "hiscore_" + mainLevel.spawner.id;
   if ( !localStorage[s] || mainLevel.score() > localStorage[s] )
      localStorage[s] = mainLevel.score();
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
   for ( var i = 0; i < gameSpeed; i++ )
      mainLevel.update ( pause / fps );
}

var Level = function () {
   this.cannonAngle = -Math.PI / 4;
   this.targetAngle = -Math.PI / 4;
   this.cannonHP = cannonMaxHP;
   this.reload = 1;

   this.enemies = new Array();

   this.controller = 0;

   this.time = 0;
   this.kills = 0;
   this.shots = 0;
   this.repairs = 0;

   this.cannonRecoil = 0;

   this.marked = 0;

   this.lastSpawn = -1;
   this.lastController = -1;

   this.spawner = spawners[0];

   this.draw = function ( context ) {
      var R = cannonShootSpeed * cannonShootSpeed / g;
      var r = cannonShootSpeed * cannonShootSpeed / g * Math.sin ( 2 * cannonMinAngle );
      var col = gradientCol ( gfx_lvlColor_alive, gfx_lvlColor_dead, this.cannonHP / cannonMaxHP );

      context.fillStyle = gfx_rangeColor;
      context.beginPath();
      context.arc ( cannonX + cannonR + cannonL*1.414, levelY, R, Math.PI/2, Math.PI/4 );
      context.fill();

      context.fillStyle = gfx_bgColor;
      context.beginPath();
      context.arc ( cannonX + cannonR + cannonL*1.414, levelY, r, Math.PI/2, Math.PI/4 );
      context.fill();

      context.beginPath();
      context.moveTo ( 0, levelY );

      // Cannon base
      context.lineTo ( 20, levelY );
      context.arc ( cannonX + cannonR, levelY, cannonR, Math.PI, 0 );

      // Enemies
      for ( i = 0; i < this.enemies.length; i++ ) {
         if ( i == 0 || this.enemies[i][0] - this.enemies[i-1][0] > 2*gfx_enemyR )
            context.lineTo ( this.enemies[i][0] - gfx_enemyR, levelY );

         context.lineTo ( this.enemies[i][0], levelY - gfx_enemyH );

         if ( i < this.enemies.length - 1 && this.enemies[i+1][0] - this.enemies[i][0] < 2*gfx_enemyR ) {
            var x = 0.5 * ( this.enemies[i][0] + this.enemies[i+1][0] );
            var y = gfx_enemyH - 2 * ( x - this.enemies[i][0] );
            context.lineTo ( x, levelY - y );
         }
         else
            context.lineTo ( this.enemies[i][0] + gfx_enemyR, levelY );
      }

      context.lineTo ( canvas.width, levelY );

      // Cannon
      context.moveTo ( cannonX + cannonR + cannonR * Math.cos ( this.cannonAngle ), levelY + cannonR * Math.sin ( this.cannonAngle ) );
      context.lineTo ( cannonX + cannonR + (cannonR + cannonL - this.cannonRecoil) * Math.cos ( this.cannonAngle ), levelY + (cannonR + cannonL - this.cannonRecoil) * Math.sin ( this.cannonAngle ) );

      context.lineWidth = gfx_linew;
      context.strokeStyle = col;
      context.fillStyle = col;

      context.stroke();

      // Marked enemy
      if ( this.marked ) {
         context.beginPath();
         context.arc ( this.marked[0], levelY - gfx_enemyH - 8, 3, 0, 2*Math.PI );
         context.fill();
      }

      // Projectiles
      for ( i = 0; i < this.projectiles.length; i++ ) {
         context.beginPath();
         context.arc ( this.projectiles[i][0], this.projectiles[i][1], gfx_linew * 0.75, 0, 2 * Math.PI );
         context.fill();
      }

      // Cannon HP
      context.beginPath();
      context.moveTo ( cannonX + 4, levelY - cannonR - 10 );
      context.lineTo ( cannonX + 4 + (2 * cannonR - 8) * this.cannonHP / cannonMaxHP, levelY - cannonR - 10 );
      context.stroke();

      // HUD
      context.font = "20px Consolas";
      context.fillText ( "Time:    " + Math.floor ( this.time ), 10, 23 );
      context.fillText ( "HP:      " + this.cannonHP + "/" + cannonMaxHP, 10, 43 );
      context.fillText ( "Kills:   " + this.kills, 10, 63 );

      var accuracy = Math.round(this.kills / this.shots * 100)
      context.fillText ( "Shots:   " + this.shots + " (" + (this.shots != 0 ? accuracy + "%" : "-") + ")", 10, 83 );
      context.fillText ( "Repairs: " + this.repairs, 10, 103 );

      context.strokeRect ( canvas.width - 100, 17, 90, 10 );
      context.fillRect ( canvas.width - 100, 17, 90 * this.reload, 10 );
      context.fillText ( "Ready: ", canvas.width - 175, 28 );

      context.fillText ( "TEST:  " + this.spawner.name, canvas.width - 175, 48 );
      context.fillText ( "SCORE: " + this.score(), canvas.width - 175, 68 );
      context.fillText ( "BEST:  " + ( localStorage["hiscore_" + this.spawner.id] ? localStorage["hiscore_" + this.spawner.id] : '-' ), canvas.width - 175, 88 );

      if ( !pause && !_gameOver ) {
         context.fillText ( "PAUSED", canvas.width - 125, 118 );
      }
      else if ( !pause && _gameOver ) {
         context.fillText ( "GAME OVER", canvas.width - 187, 118 );
      }
   }

   this.killEnemy = function ( i ) {
      if ( this.enemies[i] == this.marked )
         this.marked = 0;

      this.enemies.splice ( i, 1 );
   }

   this.damage = function () {
      this.cannonHP--;
      screenShake();
      if ( this.cannonHP <= 0 ) {
         this.cannonHP = 0;
         gameOver();
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

      for ( var i = 0; i < this.projectiles.length; i++ ) {
         this.projectiles[i][0] += this.projectiles[i][2] * t;
         this.projectiles[i][1] += this.projectiles[i][3] * t + 0.5 * g * t * t;
         this.projectiles[i][3] += g * t;

         if ( this.projectiles[i][1] >= levelY ) {
            for ( var j = 0; j < this.enemies.length; j++ ) {
               if ( Math.abs ( this.enemies[j][0] - this.projectiles[i][0] ) <= boomRange ) {
                  this.killEnemy(j); j--;
                  this.kills ++;
               }
            }

            this.projectiles.splice ( i, 1 );
            i--;
         }
      }

      this.reload += reloadSpeed * t;
      if ( this.reload >= 1 ) this.reload = 1;

      if ( mainLevel.controller && this.time - this.lastController > controllerT ) {
         f = function () { eval ( mainLevel.controller ); };
         f.call ( evalContext );
         this.lastController = this.time;
      }

      if ( this.spawner && this.spawner.condition( this ) ) {
         this.lastSpawn = this.time;
         this.enemies.push ( this.spawner.spawn ( this ) );
      }

      for ( var i = 0; i < this.enemies.length; i++ ) {
         this.enemies[i][0] -= this.enemies[i][1] * t;

         if ( this.enemies[i][0] - 10 < 20 + 2 * cannonR ) {
            this.killEnemy(i);
            this.damage();
            i--;
         }
      }

      this.enemies.sort ( function(a,b) { return a[0] - b[0]; } );

      this.cannonRecoil -= this.cannonRecoil * t * 5;
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
         this.cannonRecoil = cannonL * 0.5;
         return 1;
      }

      else return 0;
   }

   this.repair = function () {
      if ( this.reload >= 1 ) {
         this.cannonHP++;
         if ( this.cannonHP > cannonMaxHP ) this.cannonHP = cannonMaxHP;
         this.reload = 0;
         this.repairs++;
         return 1;
      }
      else return 0;
   }

   this.reset = function () {
      this.time = 0;
      this.shots = 0;
      this.kills = 0;
      this.repairs = 0;
      this.enemies.splice ( 0, this.enemies.length );
      this.projectiles.splice ( 0, this.projectiles.length );
      this.cannonHP = cannonMaxHP;
      this.lastSpawn = -1;
      this.lastController = -1;
      this.cannonAngle = -Math.PI / 4;
      this.targetAngle = -Math.PI / 4;
      this.reload = 1;
   }

   this.score = function () {
      var t = this.time;
      var k = this.kills * 5;
      var a = k != 0 ? this.shots / this.kills * 10 : 0;
      var r = this.repairs;

      return Math.round ( t + k + a - r );
   }
}

var mainLevel = new Level();

var evalContext = {
   shoot: function () { return mainLevel.shoot(); },
   repair: function () { return mainLevel.repair(); },
   setCannonAngle: function ( t ) {
      if ( t >= cannonMinAngle && t <= cannonMaxAngle )
         mainLevel.targetAngle = -t;
      else if ( t < -cannonMinAngle ) {
         this.log ( "WARNING: you're trying to set an angle lower than the minimum valid angle" );
         mainLevel.targetAngle = -cannonMinAngle;
      }
      else if ( t > cannonMaxAngle ) {
         this.log ( "WARNING: you're trying to set an angle greater than the maximum valid angle" );
         mainLevel.targetAngle = -cannonMaxAngle;
      }
   },
   getCannonAngle: function () { return -mainLevel.cannonAngle; },
   getEnemies: function () {
      result = new Array();
      for ( i = 0; i < mainLevel.enemies.length; i++ )
         result.push ( mainLevel.enemies[i][0] );
      return result;
   },
   ready: function () { return mainLevel.reload >= 1; },
   hp: function () { return mainLevel.cannonHP; },
   mark: function ( i ) { mainLevel.marked = mainLevel.enemies[i]; },
   unmark: function ( i ) { mainLevel.marked = 0; },
   log: function ( s ) { console.log(s); },
   frameTime: function () { return gameSpeed / fps; }
}
