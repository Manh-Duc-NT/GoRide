# Frontend GoRide

## Mô tả
Web **GoRide Admin** dành cho admin của hệ thống dùng để:
    1.	Quản lý người dùng và tài xế
    2.	Thống kê và báo cáo

## Công nghệ sử dụng
- React
- Vite
- React Router DOM
- Chart.js (cho biểu đồ, nếu có)
- Và các thư viện khác được liệt kê trong `package.json`

## Bắt đầu

Các hướng dẫn sau sẽ giúp cài đặt và chạy frontend của dự án **GoRide** trên máy cục bộ.

### Điều kiện tiên quyết
Để chạy được dự án này, cần cài đặt:
- Node.js (khuyến nghị phiên bản LTS mới nhất)
- npm (thường được cài đặt cùng với Node.js) hoặc yarn

### Cài đặt

1.  **Điều hướng đến thư mục `frontend`:**
    Mở terminal hoặc command prompt, và di chuyển vào thư mục `frontend` của dự án.
    ```bash
    cd ..../GoRide/frontend
    ```

2.  **Cài đặt các gói phụ thuộc:**
    Chạy lệnh sau để cài đặt tất cả các thư viện cần thiết được định nghĩa trong `package.json`.
    Sử dụng npm:
    ```bash
    npm install
    ```
    Hoặc nếu sử dụng yarn:
    ```bash
    yarn install
    ```

## Chạy ứng dụng

### Chế độ phát triển
Để khởi chạy server phát triển với hot-reloading (tự động cập nhật khi code thay đổi):
```bash
npm run dev
```
Hoặc với yarn:
```bash
yarn dev
```
Sau đó, mở trình duyệt và truy cập vào địa chỉ được hiển thị trên terminal (thường là `http://localhost:5173` nếu cổng mặc định của Vite chưa bị chiếm).
    Tài khoản: admin@gmail.com
    Mật khẩu: 123456

### Build dự án cho production
Để tạo bản build tối ưu cho môi trường production:
```bash
npm run build
```
Hoặc với yarn:
```bash
yarn build
```
Các tệp đã build sẽ nằm trong thư mục `dist`.

### Xem trước bản build production
Để xem trước bản build production trên máy cục bộ:
```bash
npm run preview
```
Hoặc với yarn:
```bash
yarn preview
```
Lệnh này sẽ khởi chạy một server tĩnh để phục vụ các tệp từ thư mục `dist`.

## Linting
Để kiểm tra và sửa lỗi code dựa trên cấu hình ESLint:
```bash
npm run lint
```
Hoặc với yarn:
```bash
yarn lint
```