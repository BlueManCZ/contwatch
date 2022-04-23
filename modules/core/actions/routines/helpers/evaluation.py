import ast
import operator as op

operators = {ast.Add: op.add, ast.Sub: op.sub, ast.Mult: op.mul,
             ast.Div: op.truediv, ast.Pow: op.pow, ast.BitXor: op.xor,
             ast.USub: op.neg}


def __get_op(_type):
    return operators[_type]


def __eval(node):
    if isinstance(node, ast.Num):
        return node.n
    elif isinstance(node, ast.BinOp):
        return __get_op(type(node.op))(__eval(node.left), __eval(node.right))
    elif isinstance(node, ast.UnaryOp):
        return __get_op(type(node.op))(__eval(node.operand))
    else:
        raise TypeError(node)


def eval_expr(expr):
    return __eval(ast.parse(expr, mode="eval").__getattribute__("body"))
