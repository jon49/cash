 #!/bin/bash

rm -rf dist
mkdir dist
cp -r pb_hooks dist/pb_hooks

mkdir dist/public
cp -r pb_public/* dist/public

cd dist/public
for file in $(find . -type f); do
  original_files+=($file)
  hash=$(md5sum $file | cut -d ' ' -f 1)
  # last 8 characters of md5 hash
  hash=${hash:24}
  new_file=($(echo $file | sed "s/\(.*\)\.\(.*\)/\1.$hash.\2/"))
  new_files+=($new_file)
  mv $file $new_file
done
cd ../..

for i in ${!original_files[@]}; do
    # Remove leading dot and replace slashes with escaped slashes
    original_file=$(echo ${original_files[$i]} | sed 's/^\.//' | sed 's/\//\\\//g')
    new_file=$(echo ${new_files[$i]} | sed 's/^\.//' | sed 's/\//\\\//g')
    # Replace original file with new file path in layout.html
    sed -i "s/$original_file/$new_file/g" dist/pb_hooks/pages/layout.html
done
