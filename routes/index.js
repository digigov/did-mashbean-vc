var express = require('express');
var router = express.Router();
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const https = require('https');

/* GET home page. */
router.get('/', function(req, res, next) {
  let record;
  try {
    record = require('../record');
  } catch (err) {
    record = {
      checkin_count: 0
    };
  }
  res.render('index', { 
    title: '豆泥卡申請',
    checkinCount: record.checkin_count
  });
});

router.get('/checkin', function(req, res, next) {

  // Load record data
  let record;
  try {
    record = require('../record');
  } catch (err) {
    // If file doesn't exist, create empty record structure
    record = {
      checkin: [],
      checkin_count: 0,
      checking_rank: {},
      pending_checkin: {}
    };
    // Write empty record to file
    fs.writeFileSync(
      path.join(__dirname, '../record.js'),
      'module.exports = ' + JSON.stringify(record, null, 3)
    );
  }
  
  // Pass record data to template
  const renderData = {
    title: '幫豆泥點蠟，直到豆泥燒完',
    checkins: record.checkin,
    checkinCount: record.checkin_count,
    checkinRank: record.checking_rank,
    status: req.query.status
  };
  res.render('checkin', renderData);
});

router.post('/checkStatus', async function(req, res, next) {
  const transactionId = req.body.transaction_id;
  const record = require('../record');
  const checkin = record.pending_checkin[transactionId];
  let status = "";
  if (checkin) {
    
    var verified = false;
    // Call verification API to check status
    const config = require('../config');
    const options = {
      hostname: 'verifier-sandbox.wallet.gov.tw',
      path: `/api/oidvp/result?transaction_id=${transactionId}&response_code=%20`,
      method: 'GET',
      headers: {
        'accept': '*/*',
        'access-token': config.verifier_accessToken,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
      }
    };

    let name = "";
    verified = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        apiReq.destroy();
        status = "server-timeout";
        resolve(false);
      
      }, 3000);

      const apiReq = https.request(options, (apiRes) => {
        let data = '';
        
        apiRes.on('data', (chunk) => {
          data += chunk;
        });

        apiRes.on('end', () => {
          clearTimeout(timeout);
          try {
            const result = JSON.parse(data);
            if (result.code === 0 && result.verify_result === true) {
              name = result.data[0].claims.find(claim => claim.ename === 'nickname')?.value || '';
              resolve(true);
            } else {
              resolve(false);
            }
          } catch (err) {
            resolve(false);
          }
        });
      });

      apiReq.on('error', (error) => {
        clearTimeout(timeout);
        resolve(false);
      });

      apiReq.end();
    });
    console.log('Verification result:', verified);
    // If verified, move checkin to main list and clean up old pending checkins
    if (verified) {
      try {
        // Move verified checkin to main checkin list
        record.checkin.push({
          ...checkin,
          nickname: name,
          verified: true
        });

        // Remove any existing checkins with same transaction_id
        // record.checkin = record.checkin.filter(c => c.transaction_id !== checkin.transaction_id);
        // Remove any duplicate transaction_ids from checkin list
        const seenTids = new Set();
        record.checkin = record.checkin.filter(c => {
          if (seenTids.has(c.transaction_id)) {
            return false;
          }
          seenTids.add(c.transaction_id);
          return true;
        });

        // Remove old pending checkins (over 30 mins)
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
        for (const [tid, pending] of Object.entries(record.pending_checkin)) {
          const checkinTime = new Date(pending.timestamp);
          if (checkinTime < thirtyMinsAgo) {
            delete record.pending_checkin[tid];
          }
        }

        // Recalculate total count
        record.checkin_count = record.checkin.length;

        // Recalculate rank
        const rankMap = {};
        record.checkin.forEach(c => {
          if (!rankMap[c.nickname]) {
            rankMap[c.nickname] = 0;
          }
          rankMap[c.nickname]++;
        });
        record.checking_rank = rankMap;
        
        // Write updated record back to file
        fs.writeFileSync('./record.js', `module.exports = ${JSON.stringify(record, null, 3)}`);

        res.json({ verified: true });
      } catch (err) {
        console.error('Error updating record:', err);
        res.status(500).json({ error: 'Failed to update record' });
      }
    } else {
      res.status(200).json({ error: status ?? 'Checkin not found' });
    }
  } else {
    res.status(404).json({ error: status ?? 'Checkin not found' });
  }
});

router.post('/getQRCode', function(req, res, next) {

  try {
    // Generate transaction ID
    const transactionId = uuidv4();
    
    // Get message from request body
    const message = req.body.message;
    if (!message) {
      throw new Error('Message is required');
    }

    // Load existing record
    const record = require('../record');

    // Add new checkin with timestamp
    const timestamp = new Date().toISOString().slice(0,19).replace('T',' ');
    record.pending_checkin = record.pending_checkin || {};
    record.pending_checkin[transactionId] = {
      nickname: "<<<NODATA>>>", // Default nickname until verified
      message: message,
      timestamp: timestamp,
      transaction_id: transactionId,
      verified: false
    };

    // Load config
    const config = require('../config');
    if (!config.verifier_ref || !config.verifier_accessToken) {
      throw new Error('Invalid configuration');
    }

    // Call verifier API to get QR code
    const verifierApiUrl = `https://verifier-sandbox.wallet.gov.tw/api/oidvp/qr-code?ref=${config.verifier_ref}&transaction_id=${transactionId}`;

    const verifierOptions = {
      headers: {
        'accept': '*/*',
        'access-token': config.verifier_accessToken,
        'cache-control': 'no-cache'
      }
    };

    // Make API request to get verifier QR code
    https.get(verifierApiUrl, verifierOptions, (verifierRes) => {
      let data = '';
      
      verifierRes.on('data', (chunk) => {
        data += chunk;
      });

      verifierRes.on('end', () => {
        try {
          // Parse verifier response data
          const verifierData = JSON.parse(data);
          if (!verifierData) {
            throw new Error('Invalid response from verifier API');
          }

          // Extract required fields
          const {
            auth_uri,
            qrcode_image,
            transaction_id: verifier_transaction_id
          } = verifierData;

          if (!auth_uri || !qrcode_image) {
            throw new Error('Missing required fields in verifier response');
          }
          
          // Update checkin count
          record.checkin_count = record.checkin.length;

          try {
            // Save updated record
            fs.writeFileSync(
              path.join(__dirname, '../record.js'),
              'module.exports = ' + JSON.stringify(record, null, 3)
            );
          } catch (err) {
            throw new Error('Failed to save record');
          }

          const qrcodeUrl = qrcode_image;

          res.json({
            qrcode: qrcodeUrl,
            auth_uri: auth_uri,
            transaction_id: transactionId
          });

        } catch (err) {
          res.status(500).json({
            error: 'Failed to process verifier response',
            message: err.message
          });
        }
      });

    }).on('error', (err) => {
      res.status(500).json({
        error: 'Failed to call verifier API',
        message: err.message
      });
    });

  } catch (err) {
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }

  
});

router.post('/generateVC', function(req, res, next) {
  const nickname = req.body.nickname;
  const birthday = req.body.birthday;
  // Load config
  const config = require('../config');

  // Build VC data payload
  const payload = {
    vcId: config.vcId,
    vcCid: config.vcCid,
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


  const options = {
    hostname: 'issuer-sandbox.wallet.gov.tw',
    path: '/api/vc-item-data', 
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': '*/*',
      'Access-Token': config.apiKey
    }
  };

  const req2 = https.request(options, (resp) => {
    let data = '';

    resp.on('data', (chunk) => {
      data += chunk;
    });

    resp.on('end', () => {
      let record;
      try {
        record = require('../record');
      } catch (err) {
        record = {
          checkin_count: 0
        };
      }      
      if (resp.statusCode === 201) {
        const responseJson = JSON.parse(data);
        const qrCodeData = {
          expired: responseJson.expired,
          qrCode: responseJson.qrCode,
          deepLink: responseJson.deepLink
        };
        res.render('qrcode', { title: '豆泥卡申請', qrCodeData: qrCodeData, checkinCount: record.checkin_count, skip:1});        
      } else {
        res.render('qrcode', { title: '豆泥卡申請', qrCodeData: qrCodeData, checkinCount: record.checkin_count, skip:1});        
      }
    });
  });

  req2.on('error', (error) => {
  });

  req2.write(JSON.stringify(payload));
  req2.end();


});

module.exports = router;
