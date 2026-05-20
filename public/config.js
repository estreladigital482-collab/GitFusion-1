(function(){
  var isCapacitor = location.protocol === 'capacitor:' || location.protocol === 'ionic:';
  window.GITFUSION_API_BASE = isCapacitor ? 'http://127.0.0.1:3737' : '';
})();
