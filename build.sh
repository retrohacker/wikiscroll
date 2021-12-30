# Create output directories
rm -rf ./output
mkdir -p ./output/{articles,images}

# Dump articles to disk
#./zimdump dump --dir ./temp ./wikipedia_en_top_maxi_2021-12.zim

# Cleanup dump
cd ./temp/A
cp ../_exceptions/* ./
fd -0 -S -10k --type f | xargs -0 -I{} rm './{}'
rg -0l 'http-equiv' | xargs -0 -I{} rm './{}'
fd -0 --type d -d 1 | xargs -0 -I{} rm -r './{}'
rm index
cd ../../

# Generate output
node index.js
