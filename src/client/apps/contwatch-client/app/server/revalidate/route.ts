export async function POST(request: Request) {
    const body = await request.json();
    // console.log(body);
    // revalidateTag("api"); // TODO: Fetching cache with revalidations
    return Response.json({ revalidated: body.tag });
}
