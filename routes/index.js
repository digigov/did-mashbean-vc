var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: '豆泥卡申請' });
});

router.post('/generateVC', function(req, res, next) {
  const nickname = req.body.nickname;
  const birthday = req.body.birthday;
  // Load config
  const config = require('../config');

  // Build VC data payload
  const payload = {
    vcId: config.vc.id,
    vcCid: config.vc.cid,
    fields: [
      {
        type: "NORMAL",
        cname: "姓名",
        ename: "nickname", 
        content: nickname
      },
      {
        type: "NORMAL",
        cname: "生日",
        ename: "ad_birthday",
        content: birthday ? (new Date(birthday).toString() === 'Invalid Date' ? '19000101' : new Date(birthday).toISOString().slice(0,10).split('-').join('')) : '19000101'
      }
    ]
  };

  // Make API request
  const https = require('https');

  const options = {
    hostname: 'issuer-sandbox.wallet.gov.tw',
    path: '/api/vc-item-data', 
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': '*/*',
      'Access-Token': config.vc.apiKey
    }
  };

  const req2 = https.request(options, (resp) => {
    let data = '';

    resp.on('data', (chunk) => {
      data += chunk;
    });

    resp.on('end', () => {
      if (resp.statusCode === 201) {
        const responseJson = JSON.parse(data);
        const qrCodeData = {
          expired: responseJson.expired,
          qrCode: responseJson.qrCode,
          deepLink: responseJson.deepLink
        };
        console.log('QR Code Data:', qrCodeData);
        res.render('qrcode', { title: '豆泥卡申請', qrCodeData: qrCodeData ,skip:1});        
      } else {
        console.error('無法取得數位豆泥卡資料');
        res.render('qrcode', { title: '豆泥卡申請', qrCodeData: qrCodeData ,skip:1});        
      }
    });
  });

  req2.on('error', (error) => {
    console.error('Error:', error);
  });

  req2.write(JSON.stringify(payload));
  req2.end();


});

module.exports = router;
