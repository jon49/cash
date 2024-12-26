GET {{url}}/login
HTTP 200
[Asserts]
xpath "string(//form/@action)" == "/login"
xpath "string(//form/@method)" == "post"
xpath "//form//input[@name='email']" exists
xpath "//form//input[@name='password']" exists
xpath "//form//input[@type='submit']" exists
