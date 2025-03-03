# Cash Tracking Application

![Application Screenshot](https://github.com/user-attachments/assets/172929b0-4bff-4771-b3db-be44aec0c661)

## About

This application was built to keep track of cash transactions and to be able to
export those to a `csv` file to be used in conjunction with hledger. But you
should be able to use it with any application that imports `csv` like a
spreadsheet.

### Technical details

This application was designed to be able to work without JavaScript on the
client and then be [progressively
enhanced](https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement)
to have some interactions be more smooth. It then was progressively enhanced to
be able to have partial offline support. Like you should be able to make a cash
transaction entry when you are offline.

Note, that the syncing capability only works with Chromium browsers. I might
look into adding support for Safari/Firefox later on. There really isn't
anything special about the sync API that couldn't be replaced by intercepting an
API call instead of relying on an event listener.

## Getting start on your local machine

### Clone the repository

```
git clone https://github.com/jon49/cash.git
cd <cloned directory>
```

### Images

Include the images. You can download the images here
<http://cash.jnyman.com/web/images.tar.xz> and unzip them in the directory
`pb_public/web/images`.

### Start the application

Delete any files in the `pb_migrations` directory.

The current version this app is using is v0.23.12.

Start the application.

```
./tasks/start.sh
```

Enter your email and password.

Go to the settings tab on the far left panel with the tool symbols.

Under `sync` click on `Import Collections` and then `Load from JSON file`. You
will find the file under `./schema/pb_schema.json`. Import everything.

On the far left panel click on the `Collections` tab that looks like a stack of
cylinders. Then add a new user in the users collection. Make sure to mark him as
`verified`. Passwords must be at least 8 characters.

Go to the page <http://127.0.0.1:8090/> which should redirect you to login.
After logging in it should redirect you to the category page. Add a category.
Then you should be redirected to the categories page. Now you can click on `New
Transaction` or the dollar symbol and you can add a transaction.

### Working with the service worker file

If you would like to change the service worker file do so by changing the
`src/app/sw.ts` file. make sure to run the `npm i` command and then `npm start`
to get started.

### Testing

Make sure you have the service running (`./tasks/start.sh`). Add the file
`local.env` to the `tests` directory. It should contain a test email and
password of your choosing:

```env
password=12345678
email=tester@example.com
url=http://127.0.0.1:8090
```

Make sure you have [Hurl](https://hurl.dev/) `6.0.0` installed. To run the tests
run the command, `./tests/test-all.sh`.

Note the caveat given in the FAQ in the Hurl documentation for Hurl about Mac
computers and libcurl caveats. I don't have a Mac so I don't know if it really
matters for the current test set up.

## Running in Production

TODO: Add docs for this.
