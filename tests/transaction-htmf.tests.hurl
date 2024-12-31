### Test html-form Requests ###
GET {{url}}/app/transactions/edit/
HTTP 200
[Asserts]
xpath "//select[@name='categoryId']//option[contains(text(),'Income - SideHustle')]" not exists
[Captures]
category_form_url: xpath "string(//form[@hf-target='#dialog']/@action)"

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
