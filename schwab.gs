var userProperties = PropertiesService.getUserProperties();
var scriptProperties = PropertiesService.getScriptProperties();
var schwab_apikey = scriptProperties.getProperty('schwab_apikey')
var schwab_secret = scriptProperties.getProperty('schwab_secret')
var encodedCredentials = Utilities.base64Encode(schwab_apikey + ":" + schwab_secret);

// On Spreadsheet open, add a menu for Schwab API
function onOpen(e) {
  var refresh_time_expiry = userProperties.getProperty("refresh_time_expiry");
  var mynow = new Date();
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Schwab API')
    .addItem('Authenticate', 'schwab_ShowPane')
    .addSeparator()
    .addItem("Authentication expires: " + refresh_time_expiry, 'null')
    .addToUi();


    if ( Date.parse(mynow) > Date.parse(refresh_time_expiry) ) {
    Logger.log("Schwab Authentication has expired, user needs to reauth.")
  }
}

function showDialog() {
  var html = HtmlService.createHtmlOutputFromFile('schwab_SidePane')
    .setWidth(400)
    .setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(html, 'Dialog Title');
}

//Open a SidePane asynchronously. The html will return by calling the function schwab_backfromPane
function schwab_ShowPane() {
  linkURL = "https://api.schwabapi.com/v1/oauth/authorize?client_id="+ schwab_apikey +"&redirect_uri=https%3A%2F%2F127.0.0.1";
  var html = HtmlService.createTemplateFromFile('schwab_SidePane')
    .evaluate();
  SpreadsheetApp.getUi().showSidebar(html);
}

// Call this function to open the sidebar
function showSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('schwab_SidePane.html')
    .setTitle('Schwab API Auth')
    .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}

function schwab_backfromPane(d) {
// Called after user clicks Step 2 button on SidePane, return here with dictionary d
  
  schwab_GetTokens(d.returnURI);
  
}

//******************************MAIN FUNCTIONS***************************************************
/**
 * Returns a balance value of your Schwab account.
 *
 * @param {"availableFunds"|"cashBalance"|"equityPercentage"|"maintenanceRequirement"|"bondValue"|"pendingDeposits"|"sma"|"longMarketValue"|"moneyMarketFund"|"availableFundsNonMarginableTrade"|"shortOptionMarketValue"|"shortBalance"|"buyingPower"|"dayTradingBuyingPower"|"liquidationValue"|"longOptionMarketValue"|"mutualFundValue"|"regTCall"|"maintenanceCall"|"savings"|"shortMarketValue"|"longMarginValue"|"shortMarginValue"|"buyingPowerNonMarginableTrade"|"marginBalance"|"accruedInterest"|"intradayBuyingPowerAmount"|"equity"|"cashReceipts"} balance The balance field to obtain
 * @customfunction
 */
function schwab_Balance(balance) {
  // Default to "availableFunds" if no balance string is provided
  if (balance === "" || balance === null || typeof balance === "undefined") {
    balance = "availableFunds";
  }

  // Valid choices
  var validBalances = [
    "availableFunds","cashBalance","equityPercentage","maintenanceRequirement","bondValue",
    "pendingDeposits","sma","longMarketValue","moneyMarketFund","availableFundsNonMarginableTrade",
    "shortOptionMarketValue","shortBalance","buyingPower","dayTradingBuyingPower","liquidationValue",
    "longOptionMarketValue","mutualFundValue","regTCall","maintenanceCall","savings","shortMarketValue",
    "longMarginValue","shortMarginValue","buyingPowerNonMarginableTrade","marginBalance",
    "accruedInterest","intradayBuyingPowerAmount","equity","cashReceipts"
  ];

  // Validate the parameter before making the API call
  if (validBalances.indexOf(balance) === -1) {
    return "Invalid balance parameter: '" + balance + "'. See function help for valid options.";
  }

  var authorization = schwab_GetBearerString();
  var options = {
    "method" : "GET",
    "headers" :  {"Authorization" : authorization},
    "muteHttpExceptions": true
  };
  var myUrl =
    "https://api.schwabapi.com/trader/v1/accounts";
  var result = UrlFetchApp.fetch(myUrl, options);

  var contents = result.getContentText();
  var responseCode = result.getResponseCode();
  Logger.log("schwab_Balance HTTP " + responseCode + " → " + contents);

  if (responseCode !== 200) {
    return "HTTP Error " + responseCode + ": " + contents.substring(0, 150);
  }

  var json;
  try {
    json = JSON.parse(contents);
  } catch (e) {
    return "Invalid JSON response";
  }

  // Defensive checks on the response structure
  if (!json || !json[0] || !json[0]["securitiesAccount"] 
    || !json[0]["securitiesAccount"]["currentBalances"]) {
    return "Unexpected response structure - currentBalances not found";
  }

  var currentBalances = json[0]["securitiesAccount"]["currentBalances"];

  // Check that the requested balance key actually exists in the returned object
  if (!currentBalances.hasOwnProperty(balance)) {
    return "Balance field '" + balance + "' was not returned by the API";
  }

  var value = currentBalances[balance];
  Logger.log(value);

  return value;
}

/**
 * Call Schwab-API to get quote field(s) for stockSymbol.
 * Returns one or more values horizontally (current cell and cells to the right).
 *
 * @param {"GOOG"} stockSymbol the stock's ticker symbol
 * @param {"openPrice"|"highPrice"|"lowPrice"|"closePrice"|"lastPrice"|"totalVolume"|"mark"|"quoteTime"|"askPrice"|"bidPrice"|"bidSize"|"askSize"|"lastSize"|"bidTime"|"askTime"|"tradeTime"|"52WeekHigh"|"52WeekLow"|"bidMICId"|"askMICId"|"lastMICId"|"markChange"|"postMarketChange"|"postMarketPercentChange"|"netChange"|"netPercentChange"|"markPercentChange"|"securityStatus"} quoteFields One or more quote fields separated by commas. Leave blank for "closePrice"
 * @customfunction
 */
function schwab_GetQuote(stockSymbol, quoteFields) {
  // Check if stockSymbol is empty
  if (stockSymbol === "" || stockSymbol === null || typeof stockSymbol === "undefined") {
    return "Stock symbol is empty";
  }

  // Default to "closePrice" if quoteFields is blank
  if (quoteFields === "" || quoteFields === null || typeof quoteFields === "undefined") {
    quoteFields = "closePrice";
  }

  // Valid fields that exist under the .quote object
  var validQuoteFields = [
    "openPrice","highPrice","lowPrice","closePrice","lastPrice","totalVolume",
    "mark","quoteTime","askPrice","bidPrice",
    "bidSize","askSize","lastSize","bidTime","askTime",
    "tradeTime","52WeekHigh","52WeekLow",
    "bidMICId","askMICId","lastMICId",
    "markChange","postMarketChange","postMarketPercentChange",
    "netChange","netPercentChange","markPercentChange",
    "securityStatus"
  ];

  // Split the requested fields, trim whitespace, and remove empty entries
  var requestedFields = quoteFields.toString().split(",")
    .map(function(f) { return f.trim(); })
    .filter(function(f) { return f.length > 0; });

  // Validate every requested field
  for (var i = 0; i < requestedFields.length; i++) {
    if (validQuoteFields.indexOf(requestedFields[i]) === -1) {
      return "Invalid quote field: '" + requestedFields[i] +
             "'. Valid options are: " + validQuoteFields.join(", ");
    }
  }

  var authorization = schwab_GetBearerString();
  var options = {
    "method": "GET",
    "headers": {"Authorization": authorization},
    "muteHttpExceptions": true
  };
  var myurl = "https://api.schwabapi.com/marketdata/v1/quotes?symbols=" + stockSymbol;
  var result = UrlFetchApp.fetch(myurl, options);

  var contents = result.getContentText();
  var responseCode = result.getResponseCode();

  Logger.log("schwab_GetQuote HTTP " + responseCode + " → " + contents);

  if (responseCode !== 200) {
    return "HTTP Error " + responseCode + ": " + contents.substring(0, 150);
  }

  var json;
  try {
    json = JSON.parse(contents);
  } catch (e) {
    return "Invalid JSON response";
  }
  Logger.log(json);

  // Defensive checks so we never crash on .quote
  if (!json || !json[stockSymbol]) {
    return "Symbol not found or no data returned for: " + stockSymbol;
  }

  if (!json[stockSymbol]["quote"]) {
    return "No quote data available for: " + stockSymbol;
  }

  var quote = json[stockSymbol]["quote"];
  var output = [];

  // Collect the requested fields in the order the user specified
  for (var j = 0; j < requestedFields.length; j++) {
    var field = requestedFields[j];
    var value = quote[field];

    if (value === undefined || value === null) {
      output.push("Field '" + field + "' not found");
    } else {
      output.push(value);
    }
  }

  Logger.log("Quote " + stockSymbol + ": " + output.join(", "));

  // Returning a 1-row array makes the values spill horizontally across columns
  return [output];
}

/**
 * Returns the positions in your Schwab portfolio with the following fields:
 * [ Symbol | Quantity | Average Price | Market Value | Current Day P/L | Current Day P/L % ]
 *
 * @customfunction
 */
function schwab_Positions() {
  var authorization = schwab_GetBearerString();
  var options = {
    method: "GET",
    headers: { "Authorization": authorization },
    muteHttpExceptions: true   // important – so we can see the real error
  };

  // Correct URL (no trailing slash before the query string)
  var myUrl = "https://api.schwabapi.com/trader/v1/accounts?fields=positions";
  var result = UrlFetchApp.fetch(myUrl, options);
  var responseCode = result.getResponseCode();
  var contents = result.getContentText();

  // Helpful debugging – look in Executions / Logs
  Logger.log("HTTP " + responseCode + " → " + contents);

  if (responseCode !== 200) {
    return [["Error", "HTTP " + responseCode, contents.substring(0, 200)]];
  }

  var json;
  try {
    json = JSON.parse(contents);
  } catch (e) {
    return [["Error", "Invalid JSON", contents.substring(0, 200)]];
  }

  // Defensive checks
  if (!json || !json[0] || !json[0].securitiesAccount) {
    return [["Error", "Unexpected response structure", JSON.stringify(json).substring(0, 200)]];
  }

  var positions = json[0].securitiesAccount.positions;

  // No positions is a normal situation – return a clear message instead of crashing
  if (!positions || !Array.isArray(positions) || positions.length === 0) {
    return [["No positions found"]];
  }

  var attributes = [
    "instrument",
    "longQuantity",
    "averagePrice",
    "marketValue",
    "currentDayProfitLoss",
    "currentDayProfitLossPercentage"
  ];

  var array = [];

  for (var i = 0; i < positions.length; i++) {
    var pos = positions[i];
    var item = [];

    for (var a = 0; a < attributes.length; a++) {
      if (attributes[a] === "instrument") {
        item.push(pos.instrument && pos.instrument.symbol ? pos.instrument.symbol : "");
      } else {
        item.push(pos[attributes[a]] != null ? pos[attributes[a]] : "");
      }
    }
    array.push(item);
  }

  // Sort by Current Day P/L % (highest first)
  array.sort(function(b, a) {
    return (a[5] || 0) - (b[5] || 0);
  });

  return array;
}

//*****************************AUTHENTICATION FUNCTIONS****************************************************************

function schwab_GetBearerString(){
// Call schwab get access token using the refresh token - check validity of both access and refresh tokens.
// Access token lasts for 30 minutes, refresh token lasts for 7 days before having to require user to authenticate again
// curl -X POST --header "Content-Type: application/x-www-form-urlencoded" -d "grant_type=refresh_token&refresh_token=<refresh_token>&redirect_uri=https%3A%2F%2F127.0.0.1" "https://api.schwabapi.com/v1/oauth2/token"

  var refresh_token = userProperties.getProperty("refresh_token");
  var refresh_time_expiry = userProperties.getProperty("refresh_time_expiry");
  var access_token = userProperties.getProperty("access_token");
  var access_time_expiry = userProperties.getProperty("access_time_expiry");
  var mynow = new Date();

//  if ( (Date.parse(mynow) - Date.parse(access_time)) <29*60*1000 ) { //Access token is still not expired
//    Logger.log(1800 - (Date.parse(mynow) - Date.parse(access_time))/1000 + " seconds until access token expires, using existing token.")
//    return "Bearer " + access_token; 
//  } else if ( (Date.parse(mynow) - Date.parse(refresh_time)) >7*24*60*60*1000 ) {  //Refresh token expired
//    //re-authenticate - schwab_showPane() ?
//    Logger.log("Refresh Token has expired. Reauthentication is probably needed, but trying to proceed with renewing the Access Token")
//    // return "Re-authentication needed!";    
//  }

  if ( Date.parse(mynow) < Date.parse(access_time_expiry) ) {
 //   Logger.log(( (Date.parse(access_time_expiry) - Date.parse(mynow)) / 1000) + " seconds until access token expires, using existing access token")
    return "Bearer " + access_token;
  }

 Logger.log("Access Token expired " + ((Date.parse(access_time_expiry) - Date.parse(mynow))/1000) + " seconds ago. Generating a new one.")

// refresh access_token with refresh token
// curl -X POST \https://api.schwabapi.com/v1/oauth/token \-H 'Authorization: Basic {BASE64_ENCODED_Client_ID:Client_Secret} \-H 'Content-Type: application/x-www-form-urlencoded' \-d 'grant_type=refresh_token&refresh_token={REFRESH_TOKEN_GENERATED_FROM_PRIOR_STEP}

  var formData = {
    "grant_type" : "refresh_token",
    "refresh_token" : refresh_token,
  }
  var options = {
    "method" : "post",
    "headers": {
    "Authorization": "Basic " + encodedCredentials
    },
    "payload" : formData
  }
  var myurl="https://api.schwabapi.com/v1/oauth/token";
  var result=UrlFetchApp.fetch(myurl, options);

  //Parse JSON
  var contents = result.getContentText();
  var json = JSON.parse(contents);
//  Logger.log("JSON string: " + JSON.stringify(json))
  
  access_token = json["access_token"];
  userProperties.setProperty("access_token", access_token);
  userProperties.setProperty("access_time_expiry", new Date(mynow.getTime() + (30 * 60 * 1000)));
  
  return "Bearer " + access_token;   
}

function schwab_GetTokens(s){
// Receive the URI, strip out the code, and call Schwab to receive Bearer Token and Refresh Token
// Access token lasts for 30 minutes, refresh token lasts for 7 days before having to require user to authenticate again
// TODO: figure out a way to not require reauth every 7 days, since that is painfully stupid
//curl -X POST \https://api.schwabapi.com/v1/oauth/token \-H 'Authorization: Basic {BASE64_ENCODED_Client_ID:Client_Secret} \-H 'Content-Type: application/x-www-form-urlencoded' \-d 'grant_type=authorization_code&code={AUTHORIZATION_CODE_VALUE}&redirect_uri=https://127.0.0.1'
   
  mycode = decodeURIComponent(s.split("code=")[1].split("&session")[0]);

  var formData = {
    "grant_type" : "authorization_code",
    "code" : mycode,
    "redirect_uri" : "https://127.0.0.1"
  }

  var options = {
    "method" : "post",
    "headers": {
    "Authorization": "Basic " + encodedCredentials
    },
    "payload" : formData
  }

  var myurl="https://api.schwabapi.com/v1/oauth/token";
  var result=UrlFetchApp.fetch(myurl, options);
  Logger.log(result)

  //Parse JSON
  var contents = result.getContentText();
  var json = JSON.parse(contents);
  
  Logger.log(json)

  access_token = json["access_token"];
  refresh_token = json["refresh_token"];
    
  var mynow = new Date();

  userProperties.setProperty("access_token", access_token);
  userProperties.setProperty("access_time_expiry", new Date(mynow.getTime() + (30 * 60 * 1000))); 
  userProperties.setProperty("refresh_token", refresh_token);
  userProperties.setProperty("refresh_time_expiry", new Date(mynow.getTime() + (7 * 24 * 60 * 60 * 1000))); 

}

//*****************************UTILITY FUNCTIONS****************************************************************

function printUserProperties() {
  for (var property in userProperties.getProperties()) {
    Logger.log(property + ": " + userProperties.getProperty(property));
  }
}
