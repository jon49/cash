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

# print out the original and new files
for i in ${!original_files[@]}; do
    # original file with the period removed
    original_file=$(echo ${original_files[$i]} | sed 's/^\.//')
    # new file with the period removed
    new_file=$(echo ${new_files[$i]} | sed 's/^\.//')
    # in the replacement command it doesn't account for the forward slashes
    original_file=$(echo $original_file | sed 's/\//\\\//g')
    new_file=$(echo $new_file | sed 's/\//\\\//g')
    sed -i "s/$original_file/$new_file/g" dist/pb_hooks/pages/layout.html
done

