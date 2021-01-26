type Unwrap<T> = T extends Promise<infer U> ? U : T;
function preval<T>(value: T): Unwrap<T>;

export default preval;
