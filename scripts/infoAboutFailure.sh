base_url="https://github.com/$GITHUB_REPOSITORY"

if [[ $GITHUB_REF == refs/pull/* ]]; then
    IFS='/' read -ra parts <<< "$GITHUB_REF"
    pull_number="${parts[2]}"
    url="$base_url/pull/$pull_number/files"
else
    url="$base_url/commit/$GITHUB_SHA"
fi

echo "::error title=关于代码检查失败的提示::您可以访问以下页面查看原因（可能需要下拉到对应页面的最底部才能找到）： $url 。"
exit 1
