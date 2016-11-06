en = this.getEnemies();

this.maxD = cannonShootSpeed * cannonShootSpeed / g;
this.minD = cannonShootSpeed * cannonShootSpeed / g * Math.sin ( cannonMinAngle );

this.anticipate = 250;

threshold = Math.PI / 32;

if ( this.ready() && en.length > 0 && en[0] - this.anticipate < this.maxD ) {
   ii = 0;
   while ( en[ii] - this.anticipate < this.minD ) ii++;

   if ( ii < en.length ) {
      x = en[ii] - this.anticipate;
      th = 0.5 * Math.asin ( x * g / cannonShootSpeed / cannonShootSpeed );
      this.setCannonAngle ( th );

      if ( Math.abs(this.getCannonAngle() - th) < threshold )
         this.shoot();
   }
}
