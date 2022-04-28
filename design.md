# closure, first-class function
(1) lift all the function to the top level, add prefix to avoid name collision.

(2) add extra parameter `closure` to all the function. (maybe just function not defined in top level)

(3) add closure class definition and function object class. All function pointer are represented as function object which contains a function pointer and a closure.

```python
def f(a:int, d: int) -> Callable[[int, int], int]:
    def f1(b: int, c: int) -> int:
        return a + b + c + d

    def f2(b: int, c: int) -> int:
        return a + b - c  
    if a > 0:
        return f1
    else:
        return f2
```
=> equal to this

```python
# generate following
def f(a:int, d: int) -> callable_int_int_int:
    if a > 0:
        return callable_int_int_int().new(f.f1, f.f1.closure().new(a, d)))
    else:
        return callable_int_int_int().new(f.f2, f.f2.closure().new(a)))

def f.f1(b: int, c: int, closure: f1_closure) -> int:
    return closure.a + b + c

def f.f2(b: int, c: int, closure: f2_closure) -> int:
    return closure.a + b - c

class f.f1.closure(object):
    a: int = 0
    d: int = 0
    def new(self, a: int, d: int):
        self.a = a
        self.d = d

class f.f2.closure(object):
    a: int = 0
    def new(self, a):
        self.a = a

class callable_int_int_int(object):
    closure: Any = None
    func_pointer: Int = 0
    def new(self, c, f):
        self.closure = c
        self.func_pointer = f
    def __call__(self, a: int, b: int) -> int:
        return self.func_pointer(a, b, self.closure)
```