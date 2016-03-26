for dir in $(find . -type d -iname "bin" -exec readlink -f {} \;)
do
	export PATH="${dir}:${PATH}"
done