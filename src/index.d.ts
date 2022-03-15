type Unwrap<T> = T extends Promise<infer U> ? U : T;
declare function preval<T>(value: T): Unwrap<T>;

export default preval;
