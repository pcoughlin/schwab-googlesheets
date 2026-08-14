# schwab-googlesheets
Script add in for Google Sheets to pull in Charles Schwab account trading data in via their API

Credits go to the following for laying the groundwork on the TD API to Google Sheets, which has been heavily modified to support the new Schwab API.

@santsleo https://github.com/santsleo/AmeritradeAPIonGoogleSheets

@kohjb https://github.com/kohjb/AmeritradeAPIwGoogleScripts

To use:

## Set up the Schwab API:

1. Sign up for a developer account from https://developer.schwab.com/register
1. Create an app that uses the Trader API - Individual, Account and Trading Production.
1. Set the callback URL to https://127.0.0.1 and save.
1. You'll need to wait until the app changes to "Ready for Use" before things will work - this can take some time, maybe a week or more.
1. Grab the App Key and Secret from your app, as you will need this later.

## In Google Sheets:

1. Create a new sheet, and navigate to Extensions > Apps Script
1. Add the 2 files from this repository into Files on the left side, and save. Rename code.gs to schwab.gs. Add the .html file.
1. Go to Project Settings and scroll down to the script properties section. Add a script property of "schwab_apikey". From developer.schwab.com get the values for Client ID and use it for "schwab_apikey". Add a script property of "schwab_secret" and enter the value from Client Secret developer.schwab.com.
1. Go to Schwab.gs, and click run. Google will make you approve this app to run.
1. Go back on the Google Sheet tab, you should now see a "Schwab Authentication" panel on the right side. If you don't see the right panel, go to Schwab API > Authenticate. Click on the link in the panel to login.
1. Go through the login process to authorize this to connect to your Schwab account. 
1. NOTE: You will be rerouted to a dead link, which is expected. Copy the URL that is now showing in the address bar.
1. Paste the URL into "Address Bar URL text" field and then click the Step 2 button. The script will properly extract your code in the URL and get the needed refresh and access tokens.
1. Now that your account is connected and you can start to call functions from the Google Sheet itself.

## Functions available:

* ***=schwab_Balance()*** default is "availableFunds", Example schwab_Balance("availableFunds"|"cashBalance"|"equityPercentage"|"maintenanceRequirement"|"bondValue"|"pendingDeposits"|"sma"|"longMarketValue"|"moneyMarketFund"|"availableFundsNonMarginableTrade"|"shortOptionMarketValue"|"shortBalance"|"buyingPower"|"dayTradingBuyingPower"|"liquidationValue"|"longOptionMarketValue"|"mutualFundValue"|"regTCall"|"maintenanceCall"|"savings"|"shortMarketValue"|"longMarginValue"|"shortMarginValue"|"buyingPowerNonMarginableTrade"|"marginBalance"|"accruedInterest"|"intradayBuyingPowerAmount"|"equity"|"cashReceipts")
Returns a balance value of your Schwab account based on the selected type.
* ***=schwab_Positions()*** returns all open positions (no parameters).
* ***=schwab_GetQuote("$SPX", "openPrice, highPrice, lowPrice, closePrice, lastPrice, totalVolume")*** returns 1 or more of the available fields from the quote. Valid columns are:
    "openPrice","highPrice","lowPrice","closePrice","lastPrice","totalVolume",
    "mark","quoteTime","askPrice","bidPrice",
    "bidSize","askSize","lastSize","bidTime","askTime",
    "tradeTime","52WeekHigh","52WeekLow",
    "bidMICId","askMICId","lastMICId",
    "markChange","postMarketChange","postMarketPercentChange",
    "netChange","netPercentChange","markPercentChange",
    "securityStatus"
    Symbols format is TSLA, $SPX, /ES

Easiest way to simply test that it is working, is to enter "=schwab_balance()" into a single cell and press enter. Your current availableFunds should now be shown in the Google Sheet.

## Note:
Unlike the TD Ameritrade API where you only had to authenticate every 90 days, the Schwab API makes you authenticate every 7 days! Safety feature or poor design??
