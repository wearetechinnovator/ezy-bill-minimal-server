const asyncHandler = (fn) => {
    try {
        return fn();
    } catch (error) {
        console.log(error);
    }
}


