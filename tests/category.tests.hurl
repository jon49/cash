GET {{url}}/app/categories/edit/
HTTP 200
[Asserts]
xpath "string(//h2)" == "New Category"
xpath "string(//form/@action)" == "/app/categories/edit/"
xpath "string(//form/@method)" == "post"
xpath "string(//form//select[@name='category']/@value)" == ""
xpath "string(//form//input[@name='subcategory']/@value)" == ""
xpath "//form//input[@name='id']" not exists

POST {{url}}/app/categories/edit/
[FormParams]
category: expense
subcategory: Dinings
HTTP 302
[Asserts]
header "location" == "/app/categories/"
[Captures]
location: header "location"

GET {{url}}/app/categories/
HTTP 200
[Asserts]
xpath "string(//h2)" == "Categories"
xpath "string(//table//tr[1]/td[1])" == "Expense"
xpath "string(//table//tr[1]/td[2])" == "Dinings"
xpath "string(//table//tr[1]/td[3]/a/@href)" startsWith "/app/categories/edit/?id="
[Captures]
edit_page: xpath "string(//table//tr[1]/td[3]/a/@href)"

GET {{url}}{{edit_page}}
HTTP 200
[Asserts]
xpath "string(//h2)" == "Edit Category"
xpath "string(//form/@action)" startsWith "/app/categories/edit/"
xpath "string(//form/@method)" == "post"
xpath "string(//form//select/option[@selected]/@value)" == "expense"
xpath "string(//form//input[@name='subcategory']/@value)" == "Dinings"
xpath "//form//input[@name='id']" exists
[Captures]
id: xpath "string(//form//input[@name='id']/@value)"

POST {{url}}/app/categories/edit/
[FormParams]
category: expense
subcategory: Dining
id: {{id}}
HTTP 302
[Asserts]
header "location" == "/app/categories/"

GET {{url}}/app/categories/
HTTP 200
[Asserts]
xpath "string(//table//tr[1]/td[1])" == "Expense"
xpath "string(//table//tr[1]/td[2])" == "Dining"
xpath "string(//table//tr[1]/td[3]/a/@href)" == "/app/categories/edit/?id={{id}}"
