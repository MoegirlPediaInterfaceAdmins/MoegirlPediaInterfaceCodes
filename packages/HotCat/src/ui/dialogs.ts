const alertError = (message: string): void => {
    void oouiDialog.alert(oouiDialog.sanitize(message), {
        title: "HotCat 小工具",
    });
};

export { alertError };
