<img src="./uaq3bik4.png"
style="width:3.06667in;height:0.61446in" />

> **API** Documentation EAZYPAY2.0
>
> 1
>
> **API** **Gateway-Integration**<img src="./ovrapspa.png"
> style="width:8.26875in;height:6.22403in" />
>
> 2

Contents
**Introduction.....................................................................................................................**4

**API**
**Details.......................................................................................................................**5
**1.** **API** **Name:** **Create** **Mandate**
**........................................................................................**5
**2.** **API** **Name:** **Execute**
**Mandate......................................................................................**9
**3.** **API** **Name:** **Mandate** **Notification**
**...............................................................................**12
**4.** **API** **Name:** **Transaction**
**Status...................................................................................**14
**5.** **API** **Name:** **Transaction** **Status** **by**
**Criteria..................................................................**17
**6.** **API** **Name:** **Refund**
**.....................................................................................................**20
**7.** **API** **Name:** **QR**
**...........................................................................................................**23
**8.** **API** **Name:** **Collect** **Pay**
**.............................................................................................**25
**9.** **API** **Name:** **Validate** **Voucher**
**.....................................................................................**27
**10.** **API** **Name:** **Redeem** **Voucher**
**.....................................................................................**29
**11.** **API** **Name:** **Mandate** **QR** **API**
**.....................................................................................**32
**12.** **Error**
**Codes................................................................................................................**41
**Security...........................................................................................................................**46
**Encryption** **&** **Decryption** **Process**
**...................................................................................**
47

> 3

**Introduction:**

> • This document describes Merchant and ICICI Bank Integration through
> API Gateway for Eazy-Pay Services.
>
> • Customer journey, API specification and securityimplementation for
> Merchant integration.
>
> <img src="./c4ba4v0y.png" style="width:1.5in;height:0.34861in" />4

**API** **Details**

> **1.** **API** **Name:** **Create** **Mandate**

**Description:** Below API will be used by Payee to Create, Update and
Revoke Mandate based on the flag and parameters passed in the Request
packet

**UAT** **Endpoint:**
[<u>https://apibankingonesandbox.com/api/MerchantAPI/UPI2/v1/CreateMandate</u>](https://apibankingonesandbox.com/api/MerchantAPI/UPI2/v1/CreateMandate)

**PROD** **Endpoint:**
[<u>https://apibankingone.com/api/MerchantAPI/UPI2/v1/CreateMandate</u>](https://apibankingone.com/api/MerchantAPI/UPI2/v1/CreateMandate)

Method : POST

**Input** **Parameters**

> 5

||
||
||
||

> 6

||
||
||
||
||
||
||
||
||
||
||
||

> **Sample** **Request**

{

> "merchantId": "118449", "subMerchantId": "118449", "terminalId":
> "5411", "merchantName": "Testmerchant", "subMerchantName": "Test",
> "payerVa": "testo@icici", "amount": "5.00",
>
> "note": "collect-pay-request", "collectByDate": "08/11/2019 06:30 PM",
> "merchantTranId": "p0nillp0k9lqlp091p17", "billNumber": "sdf1po111b",
> "validityStartDate": "08/11/2019", "validityEndDate": "20/11/2019",
>
> 7
>
> "amountLimit": "M", "remark": "MandateRequest", "requestType": "C",
> "frequency": "MT", "autoExecute": "N", "debitDay": "10", "debitRule":
> "ON", "revokable": "N", "blockfund": "N", "purpose": "RECURRING"

}

> **Output** **Parameters**

||
||
||
||
||
||
||
||
||
||
||
||
||

> **Sample** **Response**

{

> "response": "92", "merchantId": "118449", "subMerchantId": "118449",
> "terminalId": "5411", "Amount": "2.80", "success": "true",
>
> "message": "Transaction Initiated", "merchantTranId": "
> p0nillp0k9lqlp091p17", "BankRRN": "931013011368"

}

> 8
>
> **2.** **API** **Name:** **Execute** **Mandate**

**Description:** This API will be used by the Payee to Execute Mandate
and Debit the Amount from Payer’s Account and Credit into Payee’s
Account based on UMN Number

**UAT** **Endpoint:**
<u>https://apibankingonesandbox.com/api/MerchantAPI/UPI2/v1/ExecuteMandate</u>
**PROD** **Endpoint:**
[<u>https://apibankingone.com/api/MerchantAPI/UPI2/v1/ExecuteMandate</u>](https://apibankingone.com/api/MerchantAPI/UPI2/v1/ExecuteMandate)

Method : POST

**Input** **Parameters**

**Sample** **Request**

> 9

{

> "merchantId": "118449", "subMerchantId": "118449", "terminalId":
> "5411", "merchantName": "Testmerchant", "subMerchantName": "Test",
> "amount": "5.00",
>
> "merchantTranId": "p0nillp0k9lqlp091p17", "billNumber": "sdf1po111b",
>
> "remark": "MandateRequest", "retryCount": "0", "mandateSeqNo": "3",
>
> "UMN": "8fbadaeb18ff49fdbae7793faa8178d3@upi", "purpose": "RECURRING"

}

> **Output** **Parameters**

||
||
||
||
||
||
||
||
||
||
||
||

> **Sample** **Response**

{

> "response": "0", "merchantId": "118449", "subMerchantId": "118449",
> "terminalId": "5411", "Amount": "2.80", "success": "true",
>
> "message": "Transaction Successful", "merchantTranId": "
> p0nillp0k9lqlp091p17", "BankRRN": "931013011368"

}

> 10
>
> **3.** **API** **Name:** **Mandate** **Notification**
>
> **Description:** This API will be used by Merchant at-least 24 hours
> prior to Execution to notify the Payer
>
> **UAT** **Endpoint:**
> <u>https://apibankingonesandbox.com/api/MerchantAPI/UPI2/v1/MandateNotification</u>
> **PROD** **Endpoint:**
> [<u>https://apibankingone.com/api/MerchantAPI/UPI2/v1/MandateNotification</u>](https://apibankingone.com/api/MerchantAPI/UPI2/v1/MandateNotification)
>
> Method : POST
>
> **Input** **Parameters**
>
> **Sample** **Request**

{

> "merchantId": "118449", "subMerchantId": "12234", "terminalId":
> "5411", "merchantName": "Testmerchant", "subMerchantName": "Test",
> "payerVa": "9811924582@upi",
>
> 11
>
> "amount": "8.80", "note": "request",
>
> "executionDate": "30/10/2019 08:30 PM", "merchantTranId": "13s325789",
> "mandateSeqNo": "1",
>
> "key": "UMN",

"value": "305eaee068c74e0db1fe87e02f0b9230@upi" }

> **Output** **Parameters**

||
||
||
||
||
||
||
||
||
||
||
||
||

> **Sample** **Response**

{

> "response": "0", "merchantId": "106161", "subMerchantId": "12234",
> "terminalId": "5411", "BankRRN": "615519221396",
>
> "merchantTranId": "612411454593", "amount": "12",
>
> "success": "true",

"message": "Transaction Successful" }

> 12
>
> **4.API** **Name:** **Transaction** **Status**
>
> **Description:** This API will be used by Merchant to get the status
> of the transaction based on merchantTranID
>
> **UAT** **Endpoint:**
> <u>https://apibankingonesandbox.com/api/MerchantAPI/UPI2/v1/TransactionStatus</u>
> **PROD**
> **Endpoint:**[<u>https://apibankingone.com/api/MerchantAPI/UPI2/v1/TransactionStatus</u>](https://apibankingone.com/api/MerchantAPI/UPI2/v1/TransactionStatus)
>
> Method : POST
>
> **Input** **Parameters**
>
> **Sample** **Request**

{

> "merchantId": "118449", "subMerchantId": "118449", "terminalId":
> "5411",

"merchantTranId": "p0nillp0k9lqlp091p17" }

> **Output** **Parameters**

||
||
||
||
||
||
||
||
||
||

> 13

||
||
||
||
||

> 14

||
||
||
||

> **Sample** **Response**

{

> "response": "0", "merchantId": "106161", "subMerchantId": "12234",
> "terminalId": "5411",
>
> "OriginalBankRRN": "615519221396", "merchantTranId": "612411454593",
> "amount": "12",
>
> "success": "true",
>
> "message": "Transaction Successful", "status": "SUCCESS",

"UMN": "8fbadaeb18ff49fdbae7793faa8178d3@upi" }

> **Status** **for** **Non-Financial** **Transactions**
>
> CREATE-SUCCESS/CREATE-FAILURE/CREATE-INITIATED
> UPDATE-SUCCESS/UPDATE-FAILURE/UPDATE-INITIATED
> SUSPEND-SUCCESS/SUSPEND-FAILURE/SUSPEND-INITIATED
>
> REACTIVATE-SUCCESS/REACTIVATE-FAILURE/REACTIVATE-INITIATED
> REVOKE-SUCCESS/REVOKE-FAILURE/REVOKE-INITIATED
>
> **Status** **for** **Financial** **Transactions**
>
> SUCCESS/FAILURE/INITIATED/PENDING
>
> 15
>
> **5.** **API** **Name:** **Transaction** **Status** **by**
> **Criteria**
>
> **Description:** This API will be used by Merchant to get the status
> of the Mandate by passing correct transaction Type
>
> **UAT** **Endpoint:**
> <u>https://apibankingonesandbox.com/api/MerchantAPI/UPI2/v1/Transactionstatusbycriteria</u>
>
> **PROD**
> **Endpoint:**[<u>https://apibankingone.com/api/MerchantAPI/UPI2/v1/Transactionstatusbycriteria</u>](https://apibankingone.com/api/MerchantAPI/UPI2/v1/Transactionstatusbycriteria)
>
> Method : POST
>
> **Input** **Parameters**
>
> **Sample** **Request**

{

> "merchantId": "118449", "subMerchantId": "118449", "terminalId":
> "5411", "transactionType": "M", "merchantTranId":
> "p0nillp0k9lqlp091p17"

}

> 16

**Output** **Parameters**

> 17

||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||

> **Sample** **Response**

{

> "response": "0", "merchantId": "106161", "subMerchantId": "12234",
> "terminalId": "5411",
>
> "OriginalBankRRN": "615519221396", "merchantTranId": "612411454593",
> "Amount": "12",
>
> "payerVA": " testing1@imobile ", "success": "true",
>
> "message": "Transaction Successful", "status": "SUCCESS",
>
> "TxnInitDate": "20160715142352", "TxnCompletionDate":
> "20160715142352", "UMN": "8fbadaeb18ff49fdbae7793faa8178d3@upi"

}

> **Status** **for** **Non-Financial** **Transactions**
>
> CREATE-SUCCESS/CREATE-FAILURE/CREATE-INITIATED
> UPDATE-SUCCESS/UPDATE-FAILURE/UPDATE-INITIATED
>
> 18

SUSPEND-SUCCESS/SUSPEND-FAILURE/SUSPEND-INITIATED
REACTIVATE-SUCCESS/REACTIVATE-FAILURE/REACTIVATE-INITIATED
REVOKE-SUCCESS/REVOKE-FAILURE/REVOKE-INITIATED

**Status** **for** **Financial** **Transactions**
SUCCESS/FAILURE/INITIATED/PENDING

> **6.** **API** **Name:** **Refund**

**Description:** This API needs to be used by Merchants to initiate
refunds of the transactions. Both offline and online refunds are
supported in the same API.

**UAT** **Endpoint:**
<u>https://apibankingonesandbox.icicibank.com/api/MerchantAPI/UPI2/v1/Refund</u>

**Prod** **Endpoint:**
<u>https://apibankingonesandbox.icicibank.com/api/MerchantAPI/UPI2/v1/Refund</u>

Method : POST

**Input** **Parameters**

||
||
||
||
||
||
||
||
||
||
||
||
||
||

> 19

||
||
||
||

> **Sample** **Request**

{

> "merchantId": “106092”, "subMerchantId": “12234”, "terminalId":
> “2342342”, "originalBankRRN": "622415338172", "merchantTranId":
> "88442047",
>
> "originalmerchantTranId": "202020202021", "payeeVA": "yatin@imobile",
> "refundAmount": "10.00",
>
> "note": "refund-request", "onlineRefund": "Y"

}

> **Output** **Parameters**

||
||
||
||
||
||
||
||
||
||
||
||

> **Sample** **Response**

{

> "merchantId": “106092”, "subMerchantId": “12234”,
>
> "terminalId": “2342342”,
>
> 20

||
||
||
||

> 21
>
> **7.API** **Name:** **QR**
>
> **Description:** This QR API will be used to fetch refid from ICICI
> system to generated dynamic QR/ intent.
>
> **UAT** **Endpoint:**
> <u>https://apibankingonesandbox.icicibank.com/api/MerchantAPI/UPI2/v1/QR</u>
>
> **Prod** **Endpoint:**
> <u>https://apibankingonesandbox.icicibank.com/api/MerchantAPI/UPI2/v1/QR</u>
>
> Method : POST
>
> **Input** **Parameters**

||
||
||
||
||
||
||
||
||
||
||
||
||

> **Sample** **Request**

{

> "amount": "5.00", "merchantId": "118449", "subMerchantId": "118449",
> "terminalId": "5411",
>
> "merchantTranId": "p0nillp0k9lqlp091p17", "billNumber": "sdf1po111b",
> "validatePayerAccFlag": "Y", "payerAccount": "0405012740",
> "payerIFSC": "IC00000",
>
> 22

"signedIntentFlag": "Y" }

> **Output** **Parameters**

||
||
||
||
||
||
||
||
||
||
||
||
||

> **Sample** **Response**

||
||
||
||

> 23
>
> **8.API** **Name:** **Collect** **Pay**

**Description:** This QR API will be used to fetch refid from ICICI
system to generated dynamic QR/ intent.

**UAT** **Endpoint:**
<u>https://apibankingonesandbox.icicibank.com/api/MerchantAPI/UPI2/v1/CollectPay</u>

**Prod** **Endpoint:**
<u>https://apibankingonesandbox.icicibank.com/api/MerchantAPI/UPI2/v1/CollectPay</u>

Method : POST

**Input** **Parameters**

> 24

||
||
||

> **Sample** **Request**

{

> "amount": "5.00", "merchantId": {
>
> "payerVa": "testo@icici", "amount": "5.00",
>
> "note": "collect-pay-request", "collectByDate": "08/11/2019 06:30 PM",
> "merchantId": "118449", "merchantName": "Testmerchant",
> "subMerchantId": "118449", "subMerchantName": "Test", "terminalId":
> "5411",
>
> "merchantTranId": "p0nillp0k9lqlp091p17", "billNumber": "sdf1po111b",
> "validatePayerAccFlag": "Y", "payerAccount": "0405012740",
> "payerIFSC": "ICI00012345"
>
> }
>
> **Output** **Parameters**

||
||
||
||
||
||
||
||
||
||
||
||
||

> 25
>
> **Sample** **Response**

||
||
||
||

> **9.API** **Name:** Validate Voucher
>
> **Description:**
>
> **Validate** **Voucher** **API** **is** **used** **by** **merchants**
> **to** **validate** **UPI** **Prepaid** **Vouchers.** **A**
> **merchant** **has** **to** **pass** **Customer** **UUID/UMN,**
> **same** **will** **be** **validated** **and** **OTP** **will** **be**
> **sent** **to** **the** **customer** **when** **this** **API** **is**
> **invoked.**
>
> **UAT*:***
> [***<u>https://apibankingonesandbox.icicibank.com/api/MerchantAPI/UPI2/v1/ValidateVoucher</u>***](https://apibankingonesandbox.icicibank.com/api/MerchantAPI/UPI2/v1/ValidateVoucher)
>
> **Production*:***
> [***<u>https://apibankingone.icicibank.com/api/MerchantAPI/UPI2/v1/ValidateVoucher</u>***](https://apibankingone.icicibank.com/api/MerchantAPI/UPI2/v1/ValidateVoucher)
>
> Method : POST
>
> **Request** **Packet:**
>
> {
>
> "merchantId": "987123", "merchantName": "Testmerchant",
> "subMerchantId": "987123", "subMerchantName": "Test", "terminalId":
> "5411",
>
> "MCC": "1980", "merchantTranId": "2309MQR003", "amount": "147.89",
>
> "txnNote": "Voucher validation Request", "validityStartDate":
> "11/10/2019", "validityEndDate": "30/10/2019", "amRule": "MAX",
>
> "UMN": "11",
>
> "pa": "UUID Number", "sign": "",
>
> 26
>
> "orgId": "0000000", "mode": "13", "purpose": "00"
>
> }

**Input** **Parameters:**

||
||
||
||
||
||
||
||

> 27

||
||
||
||
||
||
||
||
||
||
||
||
||
||
||

**Response** **Packet:**

**Success:** {

> "merchantId": "106088", "subMerchantId": "12234", "terminalId":
> "5411","success":
>
> "true", "response": "0",
>
> "message": "Voucher Validated","BankRRN": "615519221396",
>
> 28
>
> **Failure**: {
>
> "merchantId": "106088", "subMerchantId": "12234", "terminalId":
> "5411","success":
>
> "false", "response": "11",
>
> "message": "Voucher Expired","BankRRN": "615519221396",
>
> **10.API** **Name:** **Redeem** **Voucher**
>
> Redeem Voucher API is used by merchants to redeem UPI Prepaid
> Vouchers. Merchant has to pass the OTP received by the Customer along
> with UUID/UMN. OTP will be validated and on successful validation the
> customer voucher willbe redeemed and merchant account will be credited
> when this API is invoked.

**UAT*:***
[***<u>https://apibankingonesandbox.icicibank.com/api/MerchantAPI/UPI2/v1/RedeemVoucher</u>***](https://apibankingonesandbox.icicibank.com/api/MerchantAPI/UPI2/v1/RedeemVoucher)

**Production*:***
[***<u>https://apibankingone.icicibank.com/api/MerchantAPI/UPI2/v1/RedeemVoucher</u>***](https://apibankingone.icicibank.com/api/MerchantAPI/UPI2/v1/RedeemVoucher)

> **Request** **Packet:**
>
> {
>
> "merchantId": "987123", "merchantName": "Testmerchant",
> "subMerchantId": "987123", "subMerchantName": "Test", "terminalId":
> "5411", "MCC": "1980", "merchantTranId": "2309MQR003","amount":
> "147.89",
>
> 29
>
> **Input** **Parameters:**

||
||
||
||
||
||
||
||
||
||
||
||
||
||
||

> **Response** **Packet:**

**Success:** {

> "merchantId": "106088", "subMerchantId": "12234", "terminalId":
> "5411","success":
>
> "true", "response": "0",
>
> "message": "Payment Success","BankRRN": "615519221396",
>
> 30
>
> **11.API** **Name:** **Mandate** **QR** **API**
>
> <u>Description</u>:
>
> Mandate QR API will be used to fetch ‘refid’ from ICICI system. This
> ‘refid’ will beused in tr field to generate QR/ intent string.

<u>UAT Endpoint</u>:
[**<u>https://apibankingonesandbox.icicibank.com/api/MerchantAPI/UPI2/v1/MandateQR</u>**](https://apibankingonesandbox.icicibank.com/api/MerchantAPI/UPI2/v1/MandateQR)

<u>PROD Endpoint</u>:
[**<u>https://apibankingone.icicibank.com/api/MerchantAPI/UPI2/v1/MandateQR</u>**](https://apibankingone.icicibank.com/api/MerchantAPI/UPI2/v1/MandateQR)

> 31

<u>Input Parameters</u>:

||
||
||
||
||
||
||
||
||
||
||
||
||

> 32

||
||
||

> 33

||
||
||
||
||
||
||
||

> 34

||
||
||

> 35

||
||
||
||
||
||
||

> 36

||
||
||
||

> 37

||
||
||

> Sample Request:

{

> "amount": "1.00", "amountLimit": "M", "autoExecute": "N",
>
> "billNumber": "sd321nen1k5s21cd1a134", "blockfund": "N",
>
> "debitDay": "", "debitRule": "", "frequency": "AS", "merchantId":
> "400899",
>
> "merchantName": "Testmerchant", "merchantTranId": "MerMandateQR10152",
> "purpose": "RECURRING",
>
> "remark": "Mandate787Request", "requestType": "C", "revokable": "Y",
>
> "UMN": "", "subMerchantId": "987123", "subMerchantName": "Test",
> "terminalId": "5411",
>
> "validityEndDate": "27/08/2022", "validityStartDate": "20/09/2021",
> "ValidatePayerAccFlag": "N",
>
> "payerAccount":
> "126401097401\|126401097402\|126401097403\|126401097404\|126401097405",
> "payerIFSC":
> "ICIC0001104\|ICIC0001105\|ICIC0001106\|ICIC0001107\|ICIC0001108"

}

> <u>OutputParameters:</u>

||
||
||
||
||

> 38

||
||
||

> 39

||
||
||
||
||
||
||
||
||

> Response

{

> "merchantId": "400899", "subMerchantId": "400899", "SignedQRData":

"upi%3A%2F%2Fmandate%3Fpa%3Dinvaciauat%40icici%26pn%3DInvacia+Labs%26tr%3DEZM20210827122902000256
85%26am%3D1.
00%26cu%3DINR%26orgid%3D400011%26mc%3D5411%26purpose%3D14%26tn%3DMandate787Requ
est%26validitystart%3D20092021
%26validityend%3D27082022%26amrule%3DMAX%26Recur%3DASPRESENTED%26Re
curvalue%3D%26Recurtype%3D%26Rev%3DY%26Sha
re%3DY%26Block%3DN%26umn%3Dnull%26txnType%3DCREATE
%26mode%3D11%26sign%3DMEUCIAtMZuy%2FjPOQPnjWChguRtmRN3HCUq3zM3BPBOJaBX9zAiEAiL26PBlMuGgygeQ
K1kzJ8VAscY7b3l5K4 AYODgETdAY%3D",

"refId": "EZM2021082712290200025685", "ActCode": 0,

> "terminalId": 5411,
>
> "message": "Transaction Successful", "Amount": 1,
>
> "merchantTranId": "MerMandateQR10152", "success": true

}

> **Error** **Codes**
>
> 40

||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||

> 41

||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||

> 42

||
||
||
||

> 43

||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||
||

> 44

**Security**

> a\. API Key needs to be passed in every request in the header and
> merchant IPwill also be required for IP whitelisting.
>
> **b.** API Key needs to be passed in the parameter name: **apikey**
>
> c\. API request and response to Merchant is secured using advanced and
> agreed upon encryption algorithmagreed to
> maintaindataconfidentialityand integrity.
>
> d\. API Gateway uses the standard authenticating and authorizing
> process forthe incoming request from merchant and for maintaining the
> integrity and confidentiality we apply state ofart Encryption/
> Decryption algorithm.
>
> 45

**Encryption** **&** **Decryption** **Process**

For Encryption of a payload at Client’s end.

encryptedKey =
Base64Encode(RSA/ECB/PKCS1Encryption(SesionKey,ICICIPubKey.cer)) Session
key is nothing but randomly one time generated string of length 16 (OR
32). encryptedData =
Base64Encode(AES/CBC/PKCS5Padding(Response,SessionKey))

> 1\. Generate 16-digit randomnumber (session key). Say RANDOMNO.
>
> 2\. Encrypt RANDOMNO using RSA/ECB/PKCS1Padding and encode using
> Base64. Say ENCR_KEY.
>
> 3\. Perform AES/CBC/PKCS5Padding encryption on request payload using
> RANDOMNO as key and iv- initialization vector. Say ENCR_DATA.
>
> 4\. Now client may choose to send IV in request from one of below two
> options. a. Send Base64 Encoded IV in “iv” tag. (Recommended Approach)
>
> b\. Send IV as apart ofENCR_DATA itself.
>
> bytes\[\] iv = IV;
>
> bytes\[\]cipherText = symmetrically encrypted Bytes (step3) bytes\[\]
> concatB = iv + cipherText;
>
> ENCR_DATA = B64Encode(concatB);
>
> 5\. Now in the complete request, Client needs to send encrypted
> request in below format. {
>
> "requestId": "\<request-id for tracking purpose\>", "service":
> "AccountCreation",
>
> "encryptedKey": "\<ENCR_KEY\>", "oaepHashingAlgorithm": "NONE", "iv":
> "\<IV\>",
>
> "encryptedData": "\<ENCR_DATA\>", "clientInfo": "",
>
> "optionalParam": ""
>
> }
>
> 46

For Decryption of a response at Client’s end.

> IV= getFirst16Bytes(Base64Decode(encryptedData)
>
> SessionKey =
> Base64Decode(RSA/ECB/PKCS1Decryption(encryptedKey,ClientPrivateKey.p12,))
> Session key is nothing but randomly generated string oflength 16(OR
> 32) .
>
> Response = Base64Decode (AES/CBC/PKCS5Padding
> Decryption(encryptedData,SessionKey, IV))
>
> 1\. Get the IV- Base64 decode the encryptedData and get first 16 bytes
> and rest is encryptedResponse.
>
> bytes\[\] IV= getFirst16Bytes(Base64Decode(encryptedData)
>
> 2\. Decrypt encryptedKey using algo(RSA/ECB/PKCS1Padding) and
> Client’sprivate key.
>
> sessionKey =
> B64Decode(RSA/ECB/PKCS1Decryption(encryptedKey,ClientPrivateKey.p12,))
>
> 3\. Decrypt the response using algo AES/CBC/PKCS5Padding.
>
> Response = Base64Decode (AES/CBC/PKCS5Padding
> Decryption(encryptedData,SessionKey, IV))
>
> 4\. You need to skip first16bytes of response, asit contains IV.
>
> 47
