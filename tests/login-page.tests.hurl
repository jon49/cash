GET {{url}}/login
HTTP 200
[Asserts]
xpath "string(//form/@action)" == "/login"
xpath "string(//form/@method)" == "post"
xpath "string(//form/input[@name='email'])" exists
xpath "string(//form/input[@name='password'])" exists
