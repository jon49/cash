 #!/bin/bash

rm -rf dist
mkdir dist
cp -r pb_hooks dist/pb_hooks

mkdir dist/public
cp -r pb_public/* dist/public

# Function to generate MD5 hash for a file
generate_md5_hash() {
    local file=$1
    md5sum $file | cut -d ' ' -f 1 | rev | cut -c 1-10 | rev
}

# Read layout.html
layout_file="pb_hooks/pages/layout.html"
dist_layout_file="dist/pb_hooks/pages/layout.html"
cp $layout_file $dist_layout_file

destStaticDir="dist/public"

# Find linked static files and update layout.html with MD5 hash
while IFS= read -r line; do
    if [[ $line =~ \<link.*href=\"(.*)\" ]]; then
        file="${BASH_REMATCH[1]}"
        if [[ $file != http* ]]; then
            hash=$(generate_md5_hash "$destStaticDir/$file")
            new_file="${file}?_=${hash}"
            sed -i "s|$file|$new_file|g" $dist_layout_file
        fi
    elif [[ $line =~ \<script.*src=\"([^ ]*)\" ]]; then
        file="${BASH_REMATCH[1]}"
        if [[ $file != http* ]]; then
            hash=$(generate_md5_hash "pb_public/$file")
            new_file="${file}?_=${hash}"
            sed -i "s|$file|$new_file|g" $dist_layout_file
        fi
    fi
done < $layout_file
