var userAgent;

$(function(){
  userAgent = window.navigator.userAgent.toLowerCase();

  arrowHideClickListener();
  arrowShowClickListener();
  angleHideClickListener();
  angleShowClickListener();
});

//画面幅でスマホ/タブレットか判定
function isSmartPhoneByWindowSize(){
  if (screen.width <= 768){
    return true;
  } else {
    return false;
  }
}

//ユーザーエージェントでスマホか判定
function isSmartPhoneByUserAgent(){
  var isSmartPhone2 = false;
  if (userAgent.indexOf('iphone') > 0 || userAgent.indexOf('android') > 0 && userAgent.indexOf('mobile') > 0 ||
  userAgent.indexOf('ipad') > 0 || userAgent.indexOf('android') > 0) {
    isSmartPhone2 = true;
  } else if (navigator.platform === "ipad" ||
      (navigator.platform === "macintel" &&
          navigator.standalone !== undefined)) {// iPad OS13以上対応
    isSmartPhone2 = true;
  }
  return isSmartPhone2;
}

//~~ googlemap ~~

//隠しフィールド用
var streetView;
var normalMap;
var aerialMap;

// 物件用
var map;
var mainBuildingName;
var mainAddress;
var mainLatLng;//物件の緯度経度
var mainMarker;//物件用marker
var mainIcon = 'https://82mou.github.io/src/images/marker-on-dummy.png';//物件のアイコン
var mainInfoWindow = null;//物件のインフォウィンドウ
var mainElevation;//物件の海抜
var mainSearchText;//検索ボックスのテキスト

// 付近検索用
var nearbySearch = true;//falseでフリーワード検索
var nearbyMarker;//付近検索用marker
var nearbyMarkers = [];//付近検索用markers
var nearbyInfoWindow;//付近検索結果をマウスオーバーで表示されるポップ
var nearbySearchType;
initNearbySearchType();
var selectedNearbySearchType = []//[nearbySearchType[1],nearbySearchType[2]];//選択された付近検索をtypeに変換して配列として持つ。
var nearbySearchIcon = "/static/icons/pin-yellow-solid.png";//
var callbackNearBySearchResults = [];//placeServiceのコールバックの結果を保持
var callbackCount = 0;//付近検索カウント用
var nearbyListView;//検索結果をリスト表示するフィールド
var detailsNotGot = [];

//google map apiのオブジェクト
var geocoder;//緯度経度検索オブジェクト
var bounds;//zoom調整オブジェクト
var placeService;//付近検索オブジェクト
var directionsService;// ルート検索オブジェクト
var directionsRenderer;// ルート描画オブジェクト
var elevationService;// elevationサービスのオブジェクト
var panorama;//ストリートビューオブジェクト

//ストリートビューのイベントハンドラ
var handlerStreetView;

//zoom
var beforeZoomLevel = 16;
var fitBounds = true;//fitBoundsメソッドを呼ぶときはtrue, ユーザがズームレベルを調整する場合はfalse

// テキスト検索用
var searchTextBtn;
var searchTextBox;

// 移動手段
const BY_WALK = "WALKING";
const BY_DRIVING = "DRIVING";
var nearbySearchTransportation = BY_WALK;

var avoidHighways = false;
var avoidTolls = false;

//固定値
const WALKING = '徒歩';
const DRIVING = '車';

const CLICK = 'click';
const TOUCH_START = 'touchstart';
const TOUCH_END = 'touchend';
const KEYDOWN = 'keydown';
const CHANGE = 'change';
const FOCUS = 'focus';
const MOUSEOVER = 'mouseover';
const CLOSE_CLICK = 'closeclick';
const ZOOM_CHANGE = 'zoom_changed';
const PLACE_CHANGE = 'place_changed';
const VISIBLE_CHANGE = 'visible_changed';

const UNDEFINED = 'undefined';

const NOT_SELECTED = '---';
const CONVENIENCE_STORE = 'コンビニ';
const STATION = '駅';
const RESTAURANT = '飲食店';
const SUPER_MARKET = 'スーパーマーケット';
const ELEMENTARY_SCHOOL = '小学校';
const UNIVERSITY = '大学';
const HOSPITAL = '病院';
const CAFE = 'カフェ';
const DRUG_STORE = 'ドラッグストア';
const LAUNDRY = 'クリーニング店';
const FOOD = 'フード';


function initMap() {
  mainBuildingName = "SKY-TREE";
  mainAddress = "東京都墨田区押上1-1-2";
  nearbyListView = $('.nearbyTable');

  geocoder = new google.maps.Geocoder();
  geocoder.geocode({ 'address': mainAddress}, function(results, status) {
    if (status === google.maps.GeocoderStatus.OK) {
      const lat = results[0].geometry.location.lat();
      const lng = results[0].geometry.location.lng();
      mainLatLng = {lat: lat, lng: lng};
      var mapOption =
        {
            zoom: beforeZoomLevel,
            center: mainLatLng,
            mapTypeControl: false, //マップタイプ コントロール
            fullscreenControl: false, //全画面表示コントロール
            streetViewControl: true, //ストリートビュー コントロール
            zoomControl: true //ズーム コントロール
        };
      map = new google.maps.Map(document.getElementById('map'), mapOption);
      if (map){
        placeService = new google.maps.places.PlacesService(map);

        //~~隠しメニュー系~~
        initHiddenField();

        //~~ペグマン操作~~
        setPegmanMoveListener();

        //~~物件系~~
        createMainMarker();

        //~~テキスト検索系~~
        initTextSearch();
        initAutocomplete();

        //~~拡大縮小リスナ~~
        setZoomChangeListener();

        //~~周辺検索系~~
        setNearbySelectBoxListener();
        setNearbySearchListener();
        setNearbySearchTransportationListener();
        searchNearby();
      } else {
        console.info("NO");
      }
    } else {
      alert("Geocode was not successful for the following reason: " + status);
    }
  });
}

//~~左のウィンドウ系~~
function arrowHideClickListener(){
  $(".hide-window").on(CLICK, function(){
    $(".list-search-result, .search-box, #list").toggle(700, function() {
      $(".left-window-sub").show(500);
    });
    /*本来ペグマン操作でのストリートビュー表示を検知した時に発動させるが、
    　一部モバイル端末でビュー表示の遅延により発動しないのでここでも発動させる*/
    hideExtraViewForStreetView();
  })
}
function arrowShowClickListener(){
  $(".show-window").on(CLICK, function(){
    $(".left-window-sub").toggle(500, function() {
      $(".list-search-result, .search-box, #list").toggle(700);
    });
  })
}
function angleHideClickListener(){
  $("#hide-hidden-field").on(CLICK, function() {
    $("#show-hidden-field").toggle(500);
    $(".hidden-field").toggle(500, function() {
      $("#blue-field").animate({"height": "105px"}, {duration: 500});
    });
  })
}
function angleShowClickListener(){
  $("#show-hidden-field").on(CLICK, function() {
    $(this).toggle(500);
    $(".hidden-field").toggle(1000);
    $("#blue-field").animate({"height": "210px"}, {duration: 500});
  })
}


//~~隠しフィールド操作系~~
function initHiddenField(){
  streetView = $(".street-view");
  normalMap = $(".normal-map");
  aerialMap = $(".aerial-map");

  setStreetViewClickListener();
  setNoramalMapClickListener();
  setAerialMapClickListener();
}
function setStreetViewClickListener(){
  streetView.on(CLICK, function() {
    if (map){ changeMapAndButtonColor(streetView, false); }
  })
}
function setNoramalMapClickListener(){
  normalMap.on(CLICK, function() {
    if (map){ changeMapAndButtonColor(normalMap, false); }
  })
}
function setAerialMapClickListener(){
  aerialMap.on(CLICK, function() {
    if (map){ changeMapAndButtonColor(aerialMap, false); }
  })
}
//マップ切り替え系の処理
function changeMapAndButtonColor(selectedMap, pegman){
  if (panorama && panorama.getVisible() && !pegman){//ストリートビューが表示されている&&ペグマン操作ではない
    if (selectedMap === streetView) return;
    streetView.css({"color": "white", "background": "transparent"});
    selectedMap.css({"color": "#397AF2", "background": "white"});
    changeMap(selectedMap, pegman);
    if (mainInfoWindow){//MainInfoWindowが表示されている場合
      mainInfoWindow.close();
      mainInfoWindow = null;
    }
  } else if (map.mapTypeId == "satellite"){//航空写真が表示されている
    if (selectedMap === aerialMap) return;
    aerialMap.css({"color": "white", "background": "transparent"});
    selectedMap.css({"color": "#397AF2", "background": "white"});
    changeMap(selectedMap, pegman);
    if (mainInfoWindow){//MainInfoWindowが表示されている場合
      mainInfoWindow.close();
      mainInfoWindow = null;
    }
  } else if (map.mapTypeId == "roadmap")  {//通常マップが表示されている
    if (selectedMap === normalMap) return;
    normalMap.css({"color": "white", "background": "transparent"});
    selectedMap.css({"color": "#397AF2", "background": "white"});
    changeMap(selectedMap, pegman);
    if (mainInfoWindow){//MainInfoWindowが表示されている場合
      mainInfoWindow.close();
      mainInfoWindow = null;
    }
  }
}
function changeMap(selectedMap, pegman){
  if (panorama && panorama.getVisible() && !pegman){//ストリートビューが表示されている&&ペグマン操作ではない
      toggleSelectBoxAndList();
      toggleStreetView(pegman);
  }
  if (selectedMap === streetView){
      toggleSelectBoxAndList();
      toggleStreetView(pegman);
  } else if (selectedMap === aerialMap){
      map.setMapTypeId(google.maps.MapTypeId.SATELLITE);
  } else if (selectedMap === normalMap){
      map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
  }
}
function toggleStreetView(pegman){
  if (pegman)return;//ペグマン操作の場合リターン
  if (panorama && panorama.getVisible()){//すでに表示されている
    panorama.setVisible(false);
  } else {
    removePegmanMoveListener();
    panorama = new google.maps.StreetViewPanorama(
        document.getElementById('map'), {
          position: mainLatLng,
          addressControl: false
        });
    map.setStreetView(panorama);
    setPegmanMoveListener();
  }
}
function setPegmanMoveListener(){//ペグマンを使ったストリートビューの検知
  if (!panorama) { panorama = map.getStreetView(); }
  handlerStreetView = google.maps.event.addListener(panorama, VISIBLE_CHANGE, function() {
    if (panorama.getVisible()) {//ペグマンでのストリートビュー
      changeMapAndButtonColor(streetView, true);
      hideExtraViewForStreetView();
    }
  });
}
function removePegmanMoveListener(){
  if (handlerStreetView) {
    google.maps.event.removeListener(handlerStreetView);
  }
}
function hideExtraViewForStreetView(){
  $(".gm-iv-address").hide();//左上のウィンドウ
  // $(".gm-fullscreen-control").hide();//全画面用のウィンドウ
}
function toggleSelectBoxAndList(){
  $(".selectBox").toggle();
  nearbyListView.toggle();
}


//~~mainMarker~~
function createMainMarker(){//物件マーカー配置
   mainMarker = new google.maps.Marker({
      position: mainLatLng,
      map: map
   });
}
function getMainElevation(){//物件の標高取得
   elevationService = new google.maps.ElevationService();
   elevationService.getElevationForLocations({
    locations: [mainLatLng]
   }, function(results, status){
    if (status === google.maps.ElevationStatus.OK){
      if (results[0].elevation){
        mainElevation = Math.round(results[0].elevation * 100)/100;
        mainInfoWindow = new google.maps.InfoWindow();
        mainInfoWindow.setContent('<div id="main-window"><strong> 物件名: ' + mainBuildingName + '<br> 海抜: ' + mainElevation + 'm' + '</strong><br></div>');
        openMainInfoWindow();
        setMainMarkerCloseClickListener();
      }
    } else {
      alert("海抜取得に失敗しました。")
    }
   });
}
function openMainInfoWindow(){
  mainInfoWindow.open(map, new google.maps.Marker({
    position: mainLatLng,
    map: map
  }));
  map.panTo(mainLatLng);
}
function setMainMarkerCloseClickListener(){// 吹き出しを右上の×で閉じたイベント
  google.maps.event.addListener(mainInfoWindow, CLOSE_CLICK, function() {
    mainInfoWindow.close();
    mainInfoWindow = null;
    // createMainMarker();
  });
}


//~~nearbyMarker~~
function setNearbySelectBoxListener(){
  $("select").on(CHANGE, function() {
    var selection = $(this).find("option:selected").text(),
      labelFor = $(this).attr("name"),
      label = $("[for='" + labelFor + "']");

    label.find(".label-desc").html(selection);
  });
}
function setNearbySearchListener(){//選択された検索対象を付近検索
 $("#selectNearby").on(CHANGE, function () {
   nearbySearch = true;
   fitBounds = true;
   removeDirection();
   clearDetailsNotGot();
   selectNearbySearchType();
   executeNearbySearchListener(16);
 })
}
function setNearbySearchTransportationListener(){//移動手段の切り替えリスナー　
 $("#transportation").on(CHANGE, function () {
   switch ($('#transportation').val()) {
    case DRIVING:
        nearbySearchTransportation = BY_DRIVING;
        // setRouteOptionListener(true);
        break;
    case WALKING:
        nearbySearchTransportation = BY_WALK;
        // setRouteOptionListener(false);
        break;
   }
   if (nearbySearch){//前回の検索方法が付近検索の場合
    executeNearbySearchListener(beforeZoomLevel);
   } else {//テキスト検索の場合
    executeSearchByText();
   }
 })
}
var timer = 0;
function setZoomChangeListener(){//ズームレベルの変化に伴って付近検索範囲変更
  google.maps.event.addListener(map, ZOOM_CHANGE, function() {
    const zoomLevel = map.getZoom();
    const zoomDif = zoomLevel - beforeZoomLevel;
    if (zoomLevel > 9 && zoomLevel < 17 && nearbySearch){//付近検索時のみ
      if (zoomLevel > beforeZoomLevel){//拡大時
        if (zoomDif >= 2){//周辺検索が変更になった時
          initNearbySearchType();
          selectNearbySearchType();
        } else {
          nearbySearchType.forEach(function(val, index, array){
            val.radius = val.radius / 2
          });
          selectedNearbySearchType.radius = selectedNearbySearchType.radius / 2;
        }
      } else if (zoomLevel < beforeZoomLevel) {//縮小時
        if (zoomDif <= -2){//周辺検索が変更になった時
          initNearbySearchType();
          selectNearbySearchType();
        } else {
          nearbySearchType.forEach(function(val, index, array){
            val.radius = val.radius * 2
          });
          selectedNearbySearchType.radius = selectedNearbySearchType.radius * 2;
        }
      }
      fitBounds = false;
      beforeZoomLevel = zoomLevel;
      //一瞬でズームの変更が多段階でされた場合への対応(もう少し間隔狭めても良いかも)
      if (timer > 0){ clearTimeout(timer); }
      timer = setTimeout("searchNearby()", 500);
    }
  });
}
function searchNearby(){//付近検索
   removeNearbyInfoWindow();
   removeNearbyMarker();
   removeNearbyList();
   //前回の変数を初期化
   callbackNearBySearchResults = [];
   callbackCount = 0;

   //※複数のtypeを調べたい場合はPlacesServiceをその分だけ作成する
   selectedNearbySearchType.forEach(function(val, index, array){
     if (placeService){
       placeService.nearbySearch({
        location: mainLatLng,
        radius: val.radius,
        type: [val.type],
        // rankBy: google.maps.places.RankBy.DISTANCE //これを使うとradius指定ができない
       }, callbackNearBySearch);
     } else {
      console.info("NO2");
     }
   });
}
function callbackNearBySearch(results, status) {//付近検索のコールバック
  callbackCount++;
  if (status === google.maps.places.PlacesServiceStatus.OK) {
    results.forEach(function(val, index, array){// 物件からの距離追加
      val.distance = calcDistance(mainLatLng, val.geometry.location);
    });
    if (callbackCount !== selectedNearbySearchType.length){
      callbackNearBySearchResults = (callbackNearBySearchResults.concat(results));
      return;//最後のコールバックになるまでreturn
    } else {//最後のコールバック
      var multResults = callbackNearBySearchResults.concat(results);
      callbackNearBySearchResults = [];
      var arrayPlaceIds = [];
      multResults.forEach(function(val, index, array) {//IEでflatMapが使えないので
        arrayPlaceIds.push(val.place_id);
      });
      multResults.forEach(function(val, index, array) {
        if (arrayPlaceIds.indexOf(val.place_id) === index){//重複を削除した配列を入れ直し
          callbackNearBySearchResults.push(multResults[index]);
        }
      });
      callbackNearBySearchResults.sort(function(a,b){//近い順にソート
        if (a.distance > b.distance) return 1;
        else return -1;
      });

      bounds = new google.maps.LatLngBounds();
      bounds.extend(mainLatLng);
      callbackNearBySearchResults.forEach(function (val, index, array){
        createNearbyMarker(val, index + 1);
        setNearbyList(index, val, array.length - 1);
        bounds.extend(val.geometry.location);
      });
      if (fitBounds){
        map.fitBounds(bounds);
      }
    }
  } else {
    console.info(status);
  }
}
function calcDistance(p1, p2) {//二点間の直線距離(m)計算
  if (!p1 || !p2) return 0;
  const R = 6371000; // 最大Radius (m)
  const dLat = (p2.lat() - p1.lat) * Math.PI / 180;
  const dLng = (p2.lng() - p1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat() * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
var selectedTbody;
function setNearbyList(index, place, lastIndex){//付近検索の結果をリスト表示
  var nearbyListRow;
  if (index === 0){
    nearbyListRow = '<tbody id="'+ index +'" style="text-align: center;">\
    <tr><td style="width: 20px; padding-left: 30px; padding-right: 20px;">\
    <strong>'+ (index + 1) +'</strong></td>\
    <td style="padding-top: 20px; padding-bottom: 20px; padding-right: 20px; text-align: left;"><strong>'+ place.name +'</strong></td></tr>\
    </tbody>';
  } else {
    nearbyListRow = '<tbody id="'+ index +'" style="text-align: center;">\
    <tr><td style="width: 20px; padding-left: 30px; border-top: 1px solid gainsboro; padding-right: 20px;">\
    <strong>'+ (index + 1) +'</strong></td>\
    <td style="padding-top: 20px; padding-bottom: 20px; padding-right: 20px; border-top: 1px solid gainsboro !important; text-align: left;">\
    <strong>'+ place.name +'</strong></td></tr>\
    </tbody>';
  }
  nearbyListView.append(nearbyListRow);

  if(userAgent.indexOf('msie') != -1 || userAgent.indexOf('trident') != -1) {//IEでリストの高さが画面からはみ出す対応
    var windowHeight = window.innerHeight;
    var blueFieldHeight = $("#blue-field").height();
    document.getElementById("list").style.maxHeight = (windowHeight - blueFieldHeight) + "px";
  }

  const tbody = $('#' + index);
  const obj = '<div class="balloon'+index+'" style="white-space: nowrap; display: none;">クリックでウェブサイトを開きます</div>';
  tbody.children().append(obj);
  if (place.vicinity !== 'Japan' && typeof place.vicinity !== UNDEFINED
        && selectedNearbySearchType.indexOf(nearbySearchType[1]) === -1){
    // tbody.append('<tr><td style="padding: 5px;">'+ place.vicinity +'</td></tr>');
  }

  tbody.hover(function(e){//リストにマウスオーバー
    selectedTbody = $(this);
    $(this).addClass('color-mouseover');
    executeMouseoverListener(nearbyMarkers[parseInt(this.id)]);//ルート表示
    if (index === lastIndex){
      addDetails(place.place_id, tbody, true, e, index);
    } else {
      addDetails(place.place_id, tbody, false, e, index);
    }
  },function(){//マウス離れる
    $(this).removeClass('color-mouseover');
    //ポップ非表示
    const balloon = $('.balloon'+index);
    balloon.removeClass('popup');
    balloon.hide();
  });
}
function addDetails(placeId, tbody, last, e, index){//HPがある場合表示
  const detailRequest = {
    placeId: placeId,
    fields: ['name', 'vicinity', 'place_id', 'geometry', 'website']
  };
  placeService.getDetails(detailRequest, function(result, status) {
    if (status === google.maps.places.PlacesServiceStatus.OK && selectedTbody[0].id === tbody[0].id){
      if (typeof result.website !== UNDEFINED){//HPのURLが取得できた場合
        if (isSmartPhoneByUserAgent()){
          var timerForMobile;
          tbody.bind(TOUCH_START, function(){
            timerForMobile = setTimeout(function() {
              window.location.href = result.website;
            }, 500);
          });
          tbody.bind(TOUCH_END, function() {
            clearTimeout(timerForMobile)
          });
        } else {
          tbody.on(CLICK, function(){
            window.open(result.website, '_blank');
          });
        }

        //ポップ表示→
        // const balloon = $('.balloon'+index);
        // var x = e.pageX,
        // y = e.pageY;
        // balloon.css({
        //   'z-index':'1000',
        //   'position':'absolute',
        //   'left': x - 10 + 'px',
        //   'top': y - 10 + 'px'
        // });
        // balloon.addClass('popup');
        // balloon.stop(true).fadeIn();
      }
    } else if (status === 'OVER_QUERY_LIMIT'){//一度の取得制限に引っかかった場合
    }
  });
}
function clearDetailsNotGot(){
  detailsNotGot = [];
}
function createNearbyMarker(place, index) {//マーカー配置
  nearbyMarker = new google.maps.Marker();
  nearbyMarker.setMap(map);
  nearbyMarker.setPosition(place.geometry.location);
  if (nearbySearchIcon !== ""){//独自のアイコンを使用する場合
    nearbyMarker.setIcon({url: nearbySearchIcon, origin: new google.maps.Point( 0, 0 ), labelOrigin: new google.maps.Point(17, 15)});
  }
  nearbyMarker.setLabel({text: index.toString(), color: "white"});
  nearbyMarkers.push(nearbyMarker);//nearbyMarkersを関数の外で使えるようにする。

  setNearbyMarkerListener(place);
}
function setNearbyMarkerListener(place){// マウスオーバーリスナー設定
  nearbyInfoWindow = new google.maps.InfoWindow();
  if (isSmartPhoneByUserAgent()){
    google.maps.event.addListener(nearbyMarker, CLICK, function() {
      removeDirection();
      setNearbyRoute(place, this);
    });
  } else {
    google.maps.event.addListener(nearbyMarker, MOUSEOVER, function() {
      removeDirection();
      setNearbyRoute(place, this);
    });
  }
}
function setNearbyRoute(place, listener){//物件から目的地までのルート表示
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
      map: map,
      preserveViewport: true, // 描画後に中心点をずらさない
      suppressMarkers: true //余計なアイコンを表示しない
  });
  geocoder.geocode({'placeId': place.place_id}, function(results, status) {//placeIdから緯度経度取得
    if (status === google.maps.GeocoderStatus.OK) {
      const location =  {lat: results[0].geometry.location.lat(), lng: results[0].geometry.location.lng()};
      const request = {
        origin: new google.maps.LatLng(mainLatLng), // 出発地
        destination: new google.maps.LatLng(location), // 目的地
        travelMode: nearbySearchTransportation, // 交通手段
        avoidHighways: avoidHighways,
        avoidTolls: avoidTolls
      };
      directionsService.route(request, function(result, status){// ルート検索
        if (status === google.maps.DirectionsStatus.OK) {
          var tpInfo;
          switch (nearbySearchTransportation) {
            case BY_WALK:
              tpInfo = WALKING + result.routes[0].legs[0].duration.text;
              break;
            case BY_DRIVING:
              tpInfo = DRIVING + result.routes[0].legs[0].duration.text;
              break;
          }
          var taxiFee = calculateTaxiFee(result.routes[0].legs[0].distance.value);
          if (listener != null){//infoWindow表示
            const minWidth = place.name.length * 13;
            $('.gm-style-iw').css({"min-width": minWidth+'px'});
            $('#main-window').parent().parent().parent().css('min-width', "0");//物件のウィンドウサイズは変更させない
            nearbyInfoWindow.setContent('<div style="min-width: '+minWidth+'px;"><strong>' + place.name + '<br>' + tpInfo + taxiFee +'</strong><br></div>');
            nearbyInfoWindow.open(map, listener);
            directionsRenderer.setDirections(result);
          }
        }
      })
    }
  });
}
function initNearbySearchType(){
  nearbySearchType = [{type: 'convenience_store', radius: 500}, {type: 'train_station', radius: 1000},//付近検索の対象 radius => 検索範囲(m)
                       {type: 'subway_station', radius: 1000}, {type: 'restaurant', radius: 500}];
}
function selectNearbySearchType(){
  switch ($('#selectNearby').val()) {
    case NOT_SELECTED:
        selectedNearbySearchType = [];
        break;
    case CONVENIENCE_STORE:
        selectedNearbySearchType = [nearbySearchType[0]];
        break;
    case STATION:
        selectedNearbySearchType = [nearbySearchType[1], nearbySearchType[2]];
        break;
    case RESTAURANT:
        selectedNearbySearchType = [nearbySearchType[3]];
        break;
   }
}
function calculateTaxiFee(distance){//タクシー料金計算
  const firstRideFee = 410;
  const firstRideDistnce = 1052;
  if (nearbySearchTransportation === BY_DRIVING){
    if (distance <= firstRideDistnce){//初乗り
      return '<br>タクシー概算: ' + firstRideFee + '円';
    } else {//237mごとに80円加算
      const plusDistance = distance - firstRideDistnce;//加算対象距離
      const plusFee = Math.floor((plusDistance / 237) * 80);
      return '<br>タクシー概算(高速料金抜き): ' + ((firstRideFee + plusFee).toLocaleString()) + '円';
    }
  } else return '';
}
function executeMouseoverListener(marker){//markerにセットされたmouseoverリスナー発火
    if (isSmartPhoneByUserAgent()){
      google.maps.event.trigger(marker, CLICK, null);
    } else {
      google.maps.event.trigger(marker, MOUSEOVER, null);
    }
}
function executeNearbySearchListener(zoomLevel){//付近検索リスナー発火
   map.setCenter(mainLatLng);
   map.setZoom(zoomLevel);
}
function executeSearchByText(){//テキスト検索リスナー発火
    $('#search-btn').trigger(CLICK);
}
function removeNearbyMarker(){//前に表示されたnearbyMarkerを削除
  if (nearbyMarkers.length !== 0){
    nearbyMarkers.forEach(function(val, index, array){
      if (val != null){
        val.setMap(null);//マーカーの削除
      }
    });
    nearbyMarkers.length = 0;
    removeNearbyMarkerListener();
  }
}
function removeNearbyList(){
  nearbyListView.empty();
}
function removeNearbyInfoWindow(){
  if (nearbyInfoWindow){
    nearbyInfoWindow.close();
  }
}
function removeNearbyMarkerListener(){//前にセットしたリスナーを削除
    google.maps.event.removeListener();
}
function removeDirection(){//前の表示ルート削除
  if (directionsRenderer != null){
    directionsRenderer.setMap(null);
  }
}


//~~テキスト検索~~
function initTextSearch(){
  searchTextBtn = $('#search-btn');
  searchTextBox = $('input[name="search-box"]');
  setTextSearchListener();
}
function setTextSearchListener(){
  searchTextBtn.on(CLICK, function(){
    const searchText = searchTextBox.val();
    if (searchText){ textSearch(searchText); }
  });
  searchTextBox.on(KEYDOWN, function(e) {//検索ボックスのリスナーエンター
    if(typeof e.keyCode === UNDEFINED || e.keyCode === 13){
      executeSearchByText()
    }
  });
  searchTextBox.on(FOCUS, function() {
    if (isSmartPhoneByUserAgent()){
      document.getElementById('search-box').selectionStart = 0;
      document.getElementById('search-box').selectionEnd = $(this).val().length;
    } else {
      $(this).select();
    }
  });
}
function initAutocomplete() {//テキスト検索のオートコンプリート
  const LatLngFrom = new google.maps.LatLng(20.2531, 136.0411);//最南端
  const LatLngTo   = new google.maps.LatLng(45.3326, 148.4508);//最北端
  bounds = new google.maps.LatLngBounds(LatLngFrom, LatLngTo);
  const options = {
    types: ['(regions)'],
    bounds: bounds,
    componentRestrictions: {country: 'jp'}
  };
  const autoComplete = new google.maps.places.Autocomplete(document.getElementById('search-box'), options);
  google.maps.event.addListener(autoComplete, PLACE_CHANGE, function() {
       executeSearchByText();
  });
}
function textSearch(seachText){
  nearbySearch = false;
  const request = {
    query: seachText,
    location: map.getCenter()
  };
  placeService.textSearch(request, callbackTextSearch);
}
function callbackTextSearch(results, status){
  if (status === google.maps.places.PlacesServiceStatus.OK){
    if (panorama && panorama.getVisible()){//ストリートビューが表示されている場合通常マップに戻す
      changeMapAndButtonColor(normalMap, false);
    }

    fitBounds = true;
    removeNearbyInfoWindow();
    removeNearbyMarker();
    removeNearbyList();
    results.forEach(function(val, index, array){//物件からの距離追加
      val.distance = calcDistance(mainLatLng, val.geometry.location);
    });
    results.sort(function(a,b){//距離でソート
      if (a.distance > b.distance) return 1;
      else return -1;
    });
    bounds = new google.maps.LatLngBounds();
    bounds.extend(mainLatLng);
    results.forEach(function(val, index, array){
      nearbySearchIcon = "";
      createNearbyMarker(val, index + 1);
      setNearbyList(index, val, array.length - 1);
      bounds.extend(val.geometry.location);
      if (index === 0){//リストの最初に対してルート表示
        executeMouseoverListener(nearbyMarkers[index]);
      }
    });
    if (mainSearchText !== searchTextBox.val()){
      map.fitBounds(bounds);
      mainSearchText = searchTextBox.val();
    }
  }
}
