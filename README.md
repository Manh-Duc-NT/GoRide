# GoRide (Ứng dụng di động)

## Mô tả
- **GoRide** được xây dựng dựa trên React Native cho giao diện di động (hỗ trợ cả iOS và Android), React JS cho giao diện web admin và Firebase làm nền tảng backend. 
- Sự kết hợp này đảm bảo ứng dụng không chỉ có giao diện thân thiện, mượt mà mà còn sở hữu khả năng xử lý dữ liệu thời gian thực, bảo mật cao và dễ dàng mở rộng.
- Firebase cung cấp các dịch vụ như Firebase Authentication để xác thực người dùng, Firebase Realtime Database và Firestore để quản lý dữ liệu chuyến đi, vị trí, thanh toán, cũng như Firebase Cloud Messaging để gửi thông báo đẩy.
- **GoRide** tích hợp Maps API cho phép ứng dụng hỗ trợ định vị GPS và theo dõi hành trình theo thời gian thực, mang lại trải nghiệm trực quan cho cả khách hàng và tài xế.

## Tính năng
- **Khách hàng**:
    1.	Đăng ký và xác thực thông tin
    2.	Cập nhật địa chỉ hiện tại
    3.	Đặt xe/gọi xe
    4.	Xem thông tin đơn xe và theo dõi hành trình
    5.	Cập nhật hành trình chuyến đi
    6.	Đánh giá chuyến đi
    7.	Thanh toán
    8.	Xem lịch sử các chuyến đi
    9.	Tính năng liên lạc khẩn cấp
- **Tài xế**:
    1.	Đăng ký và xác thực thông tin
    2.	Nhận và quản lý chuyến xe
    3.	Cập nhật vị trí của tài xế trên hệ thống
    4.	Xem chi tiết hành trình chuyến xe
    5.	Hoàn thành chuyến đi và xác nhận hoàn thành chuyến xe
    6.	Xem thống kê thu nhập và lịch sử chuyến đi
- **Admin**:
    1.	Quản lý người dùng và tài xế
    2.	Đăng nhập
    3.	Thống kê và báo cáo

## Công nghệ sử dụng
Ứng dụng này được xây dựng bằng các công nghệ sau:
- **React Native**: Framework chính để phát triển ứng dụng di động đa nền tảng.
- **Expo**: Nền tảng và bộ công cụ giúp đơn giản hóa việc phát triển React Native.
- **React Navigation**: Thư viện quản lý điều hướng giữa các màn hình.
- **Firebase**: Sử dụng cho các dịch vụ backend như xác thực, cơ sở dữ liệu thời gian thực, lưu trữ, v.v. (tùy theo cấu hình dự án).
- **Axios**: Thư viện thực hiện các yêu cầu HTTP đến API.
- **@rnmapbox/maps**: Tích hợp bản đồ Mapbox.
- **Expo Location**: Truy cập thông tin vị trí.
- **Expo Image Picker**: Chọn hình ảnh từ thiết bị.
- **AsyncStorage**: Lưu trữ dữ liệu cục bộ.
- **Formik & Yup**: Xử lý và xác thực biểu mẫu.
- Và nhiều thư viện hữu ích khác được liệt kê trong tệp `package.json`.

## Cấu trúc thư mục nguồn (`src`)
Thư mục `src` chứa mã nguồn chính của ứng dụng, được tổ chức như sau:
- `components/`: Chứa các thành phần UI tái sử dụng.
- `config/`: Chứa các tệp cấu hình (ví dụ: Firebase, API keys).
- `contexts/`: Chứa các React Contexts để quản lý trạng thái toàn cục.
- `navigation/`: Định nghĩa các stack điều hướng và luồng di chuyển trong ứng dụng.
- `screens/`: Chứa các thành phần màn hình chính của ứng dụng.
- `services/`: Chứa logic gọi API và các dịch vụ khác.
- `types/`: Chứa các định nghĩa TypeScript (nếu có) hoặc các kiểu dữ liệu chung.

## Bắt đầu

Làm theo các hướng dẫn sau để có một bản sao của dự án và chạy trên máy cục bộ hoặc thiết bị cho mục đích phát triển và thử nghiệm.

### Điều kiện tiên quyết
- **Node.js**: Phiên bản LTS mới nhất được khuyến nghị. (Tải về tại [nodejs.org](https://nodejs.org/))
- **npm** hoặc **yarn**: Trình quản lý gói cho Node.js. npm được cài đặt cùng Node.js. Yarn có thể cài đặt riêng.
- **Expo CLI** (tùy chọn, nhưng hữu ích):
  ```bash
  npm install -g expo-cli
  ```
- **Git**: Để clone repository.
- **Android Studio** (cho phát triển Android): Bao gồm Android SDK và emulator.
- **Xcode** (cho phát triển iOS trên macOS): Bao gồm iOS SDK và simulator.
- **Ứng dụng Expo Go**: Cài đặt trên thiết bị di động (Android/iOS) để chạy dự án nhanh chóng mà không cần build.(Chỉ hỗ trợ Expo phiên bản SDK 52. Tải về tại(https://expo.dev/go?sdkVersion=52&platform=android&device=false))

### Cài đặt

1.  **Clone repository về máy:**
    ```bash
    git clone https://github.com/Manh-Duc-NT/GoRide 
    cd GoRide
    ```
    Hoặc giải nén tệp nén chứa dự án

2.  **Cài đặt các gói phụ thuộc:**
    Mở terminal trong thư mục gốc của dự án (thư mục `GoRide` vừa clone hoặc vừa giải nén) và chạy:
    Sử dụng npm:
    ```bash
    npm install
    ```
    Hoặc nếu sử dụng yarn:
    ```bash
    yarn install
    ```

### Chạy ứng dụng

Trước khi chạy ứng dụng, hãy chạy Frontend trước bằng cách vào thư mục `frontend` và làm theo hướng dẫn trong `README.md` để mở web GoRide Admin

Sau khi cài đặt xong, có thể chạy ứng dụng bằng các lệnh sau từ thư mục gốc của dự án:

1.  **Khởi động Metro Bundler và Expo Developer Tools:**
    ```bash
    npm start
    ```
    Hoặc:
    ```bash
    expo start
    ```
    Lệnh này sẽ mở một trang trong trình duyệt web với QR code và các tùy chọn để chạy ứng dụng:
    *   **Quét QR code bằng ứng dụng Expo Go** trên điện thoại Android hoặc iOS để chạy trực tiếp trên thiết bị.
    *   Nhấn `a` để mở trên **Android Emulator** (nếu đã cài đặt và cấu hình).
    *   Nhấn `i` để mở trên **iOS Simulator** (trên macOS, nếu đã cài đặt và cấu hình).

2.  **Chạy trực tiếp trên nền tảng cụ thể:**
    *   Để chạy trên Android (emulator hoặc thiết bị đã kết nối):
        ```bash
        npm run android
        ```
        Hoặc:
        ```bash
        expo start --android
        ```
    *   Để chạy trên iOS (simulator hoặc thiết bị đã kết nối, chỉ trên macOS):
        ```bash
        npm run ios
        ```
        Hoặc:
        ```bash
        expo start --ios
        ```
    *   Để chạy trên web:
        ```bash
        npm run web
        ```
        Hoặc:
        ```bash
        expo start --web
        ```
## Bổ sung

Thư mục `UML` chứa các file code để vẽ các biểu đồ (usecase, diagram, sequence, activity)
    *   Dán trực tiếp code vào PlanUML Online (https://plantuml.com/plantuml/uml) để tạo biểu đồ
    *   Nếu dùng IDE Visual Studio Code thì cài đặt Extensions "PlanUML" để vẽ biểu đồ trên máy cục bộ
