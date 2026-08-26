%dw 2.0
fun compactObject(value: Object) = value filterObject ((item) -> item != null)
