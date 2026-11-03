### Test html-form Requests ###
GET {{url}}/app/transactions/edit/
HTTP 200
[Asserts]
xpath "//select[@name='categoryId']//option[contains(text(),'Income - SideHustle')]" not exists
[Captures]
category_form_url: xpath "string(//form[@hz][contains(@action,'/categories/')]/@action)"
add_another_url: xpath "string(//button[contains(text(),'Save & New')]/@formaction)"
category_id: xpath "string(//form//select[@name='categoryId']/option[1]/@value)"

GET {{url}}{{category_form_url}}
[Query]
_hz: 1
HTTP 200
[Asserts]
xpath "//x-modal[@hz-target='#dialog']" exists
xpath "string(//dialog//header//p)" == "New Category"
xpath "//form[@id='categoryForm'][@hz]" exists
xpath "//form[@id='categoryForm']//select[@name='category']" exists
xpath "//form[@id='categoryForm']//input[@name='subcategory']" exists
[Captures]
income_id: xpath "string(//form[@id='categoryForm']//select[@name='category']/option[2]/@value)"
category_form_url: xpath "string(//form[@id='categoryForm']/@action)"

# Create a new category
POST {{url}}{{category_form_url}}
[Form]
category: {{income_id}}
subcategory: SideHustle
_hz: 1
HTTP 200
[Asserts]
xpath "//select[@id='select-category']//option[contains(text(),'Income - SideHustle')]" exists
xpath "//header" not exists

# Create a new transaction and immediately create another

POST {{url}}{{add_another_url}}
[Form]
description: Testing 2
date: 2025-01-12
categoryId: {{category_id}}
amount: 112
_hz: 1
HTTP 200
[Asserts]
xpath "//form[@id='transaction-edit-form']" exists
xpath "//header" not exists
