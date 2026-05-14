# Cinema Booking API

Base URL:

```txt
http://localhost:5000/api
```

All responses use this shape:

```json
{
  "success": true,
  "message": "",
  "data": {}
}
```

For protected routes, send:

```txt
Authorization: Bearer <token>
```

## Auth

```txt
POST /auth/register
POST /auth/login
GET  /auth/profile
```

Register body:

```json
{
  "full_name": "Nguyen Van A",
  "email": "customer@gmail.com",
  "phone": "0900000000",
  "password": "123456"
}
```

Login body:

```json
{
  "email": "admin@gmail.com",
  "password": "admin123"
}
```

## Movies

```txt
GET /movies?page=1&limit=10
GET /movies/search?search=avengers
GET /movies?genre=Action
GET /movies?status=NOW_SHOWING
GET /movies/:id
```

## Showtimes

```txt
GET /showtimes
GET /showtimes?movie_id=1&status=OPEN
GET /showtimes/movie/:movieId
```

## Seats

```txt
GET /seats/showtime/:showtimeId
GET /seats/room/:roomId
```

## Bookings

```txt
POST /bookings
GET  /bookings/history
GET  /bookings/:id
```

Create booking body:

```json
{
  "showtime_id": 1,
  "seat_ids": [1, 2],
  "foods": [
    {
      "food_id": 1,
      "size_name": "M",
      "quantity": 1
    }
  ]
}
```

## Payments

```txt
POST /payments
```

Create payment body:

```json
{
  "booking_id": 1,
  "payment_method": "MOMO"
}
```

## Foods

```txt
GET /foods
GET /foods/sizes
GET /foods/sizes?food_id=1
```

## Promotions

```txt
POST /promotions/apply
```

Apply promotion body:

```json
{
  "code": "SALE10",
  "total_amount": 180000
}
```

## Admin

Roles:

```txt
ADMIN, EMPLOYEE, CUSTOMER
```

Admin routes require `ADMIN` or `EMPLOYEE`. Movie write/delete routes require `ADMIN`.

```txt
GET    /admin/dashboard
GET    /admin/movies
GET    /admin/movies/:id
POST   /admin/movies
PUT    /admin/movies/:id
DELETE /admin/movies/:id
GET    /admin/showtimes
POST   /admin/showtimes
PUT    /admin/showtimes/:id
DELETE /admin/showtimes/:id
```
