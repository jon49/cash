# Clean the database by calling the URL to clean the db
POST {{url}}/app/delete-all-data/
HTTP 200
[Asserts]
jsonpath "$.success" == true