 #!/bin/bash

rm -rf dist
mkdir dist

cp -r pb_hooks dist/pb_hooks

mkdir dist/public
cp -r pb_public/* dist/public

mkdir dist/pb_migrations
cp -r pb_migrations/* dist/pb_migrations

# Function to generate MD5 hash for a file
generate_md5_hash() {
    local file=$1
    md5sum $file | cut -d ' ' -f 1 | rev | cut -c 1-10 | rev
}

# Read layout.html
manifest_file="dist/public/web/manifest.json"
destStaticDir="dist/public"

# In the dist/public/web/manifest.json file, find linked static image src files and add MD5 hash
while IFS= read -r line; do
    if [[ $line =~ \"src\":\ \"([^\"]+)\" ]]; then
        file="${BASH_REMATCH[1]}"
        if [[ $file != http* ]]; then
            hash=$(generate_md5_hash "$destStaticDir/$file")
            new_file="${file}?_=${hash}"
            sed -i "s|$file|$new_file|g" $manifest_file
        fi
    fi
done < $manifest_file

# Find linked static files and update layout.html with MD5 hash
for dist_html_file in dist/pb_hooks/pages/*.html; do
    echo "Updating $dist_html_file"
    while IFS= read -r line; do
        if [[ $line =~ \<link.*href=\"([^\"]+)\" ]]; then
            file="${BASH_REMATCH[1]}"
            if [[ $file != http* ]]; then
                hash=$(generate_md5_hash "$destStaticDir/$file")
                new_file="${file}?_=${hash}"
                sed -i "s|$file|$new_file|g" $dist_html_file
            fi
        elif [[ $line =~ \<.*src=\"([^ ]*)\" ]]; then
            file="${BASH_REMATCH[1]}"
            if [[ $file != http* ]]; then
                hash=$(generate_md5_hash "pb_public/$file")
                new_file="${file}?_=${hash}"
                sed -i "s|$file|$new_file|g" $dist_html_file
            fi
        elif
            [[ $line =~ url\(\"([^\"]+)\" ]]; then
            file="${BASH_REMATCH[1]}"
            if [[ $file != http* ]]; then
                hash=$(generate_md5_hash "$destStaticDir/$file")
                new_file="${file}?_=${hash}"
                sed -i "s|$file|$new_file|g" $dist_html_file
            fi
        fi
    done < $dist_html_file
done

# Service worker build
npm run build
sw_file="dist/public/app/sw.js"
sw_js_file="dist/public/web/js/sw.js"
timestamp=$(date +%s)
sed -i "s/v1/v${timestamp}/g" $sw_js_file
echo "importScripts('/web/js/sw.js?_=${timestamp}')" > $sw_file
