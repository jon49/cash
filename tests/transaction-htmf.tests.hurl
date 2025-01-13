### Test html-form Requests ###
GET {{url}}/app/transactions/edit/
HTTP 200
[Asserts]
xpath "//select[@name='categoryId']//option[contains(text(),'Income - SideHustle')]" not exists
[Captures]
category_form_url: xpath "string(//form[@hf-target='#dialog']/@action)"
add_another_url: xpath "string(//button[contains(text(),'Save & New')]/@formaction)"
category_id: xpath "string(//form//select[@name='categoryId']/option[1]/@value)"

GET {{url}}{{category_form_url}}
HF-Request: true
HTTP 200
[Asserts]
xpath "string(//dialog//header//p)" == "New Category"
xpath "//form[@id='categoryForm']//select[@name='category']" exists
xpath "//form[@id='categoryForm']//input[@name='subcategory']" exists
[Captures]
income_id: xpath "string(//form[@id='categoryForm']//select[@name='category']/option[2]/@value)"
category_form_url: xpath "string(//form[@id='categoryForm']/@action)"

# Create a new category
POST {{url}}{{category_form_url}}
HF-Request: true
[Form]
category: {{income_id}}
subcategory: SideHustle
HTTP 200
[Asserts]
xpath "//select[@name='categoryId']//option[contains(text(),'Income - SideHustle')]" exists

# Create a new transaction and immediately create another

POST {{url}}{{add_another_url}}
HF-Request: true
[Form]
description: Testing 2
date: 2025-01-12
categoryId: {{category_id}}
amount: 112
HTTP 200
[Asserts]
xpath "//form[@id='transaction-edit-form']" exists
