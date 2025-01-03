GET {{url}}/app/settings/
HTTP 200
[Asserts]
xpath "//input[@value='currency']/ancestor::form//input[@value='$']" exists
xpath "//input[@value='replacementText']/ancestor::form//input[@name='value'][@value='']" exists

POST {{url}}/app/settings/
[Form]
value: €
id: currency
HTTP 302
[Asserts]
header "location" contains "/app/settings/?currencyMsg="

POST {{url}}/app/settings/
[Form]
value: expense->cheese
id: replacementText
HTTP 302
[Asserts]
header "location" contains "/app/settings/?replacementTextMsg="

GET {{url}}/app/settings/
HTTP 200
[Asserts]
xpath "//input[@value='currency']/ancestor::form//input[@value='€']" exists
xpath "//input[@value='replacementText']/ancestor::form//input[@value='expense->cheese'][@placeholder='old->new']" exists

# Test POST with an HTMF request
POST {{url}}/app/settings/
HF-Request: true
[Form]
value: ¥
id: currency
HTTP 200
[Asserts]
header "content-type" == "text/html; charset=utf-8"
xpath "string(//p)" contains "Saved"

GET {{url}}/app/settings/
HTTP 200
[Asserts]
xpath "//input[@value='currency']/ancestor::form//input[@value='¥']" exists

# Test that the transactions page uses ¥ for currency
GET {{url}}/app/transactions/
HTTP 200
[Asserts]
xpath "string(//table//tr[1]/td[3])" == "(¥100.00)"

### Test that exports use the replacement text ###

# First restore the the transaction

GET {{url}}/app/transactions/
HTTP 200
[Captures]
id: xpath "string(//td[contains(text(), 'Out to lunch')]/ancestor::tr/td/form/input[@name='id']/@value)"

POST {{url}}/app/transactions/restore/
[Form]
id: {{id}}
HTTP 302
[Asserts]
header "location" == "/app/transactions/"

POST {{url}}/app/export/
HTTP 200
[Asserts]
header "content-disposition" contains "attachment; filename=\"cash-transactions.csv\""
body contains "Date,Description,Amount,Category"
body contains "2024-12-31,\"Out to lunch with my delightful wife.\",100,cheese:Dining"
